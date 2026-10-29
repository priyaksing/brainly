"""
Stage 0: bookmark enrichment.

A bookmark in this app stores only a title and a URL, which is not enough to
search through later. This script visits each saved page, reads it, and writes
back three new fields:

    summary     - 2 to 3 sentences describing what the page covers
    aiTags      - 3 to 5 topic tags, e.g. ["databases", "distributed-systems"]
    enrichedAt  - when we did this

Run it with:  .venv/Scripts/python enrich.py

Safe to re-run: it only looks at bookmarks that have no summary yet, so
finished work is never repeated (and never paid for twice).
"""

from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup
from openai import OpenAI
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict
from pymongo import MongoClient
from pymongo.errors import ConfigurationError

# ---------------------------------------------------------------------------
# 1. Config
#
# This is the Python version of brainly-backend/src/config/env.ts: read values
# from .env and fail immediately if something required is missing, rather than
# crashing halfway through a run. Field names map to upper-case env vars, so
# `db_connection` reads DB_CONNECTION.
# ---------------------------------------------------------------------------


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    db_connection: str
    openai_api_key: str
    openai_model: str = "gpt-4o-mini"
    batch_limit: int = 10
    max_text_chars: int = 6000
    request_timeout: int = 15


settings = Settings()
openai_client = OpenAI(api_key=settings.openai_api_key)


# ---------------------------------------------------------------------------
# 2. The shape we want back from the model
#
# Passing this class to the API guarantees valid JSON with exactly these
# fields, so we never have to parse prose or guess. This is OpenAI's
# "structured outputs" feature.
# ---------------------------------------------------------------------------


class Enrichment(BaseModel):
    summary: str
    tags: list[str]


# Below this many characters we got boilerplate or a JavaScript shell, not
# content. Storing it would pollute the vector index in Phase 1.
MIN_USEFUL_TEXT = 200

# Types where fetching the link cannot produce article text anyway.
NO_TEXT_TYPES = {"image", "video"}


SYSTEM_PROMPT = """You help index a personal bookmark library. For each saved page you write a short factual summary and a few topic tags.

summary: 2 to 3 sentences, under 400 characters, plain third person. Start with the subject itself - never with "The page", "This article" or "This video". Describe what the page actually covers so the user recognises it months later. No marketing language. Use only the text provided - never invent details. If little text was provided, describe it generally from the title and URL instead of guessing specifics.

tags: 3 to 5 lowercase tags naming the SUBJECT of the page.
- Use the established name of a technology, field or concept. Hyphenate multi-word names - never split them apart.
- Good: databases, distributed-systems, system-design, react, postgres, kubernetes, machine-learning
- Too generic, never use: data, systems, design, software, technology, programming, code, web
- Wrong: splitting "distributed systems" into "distributed" + "systems"
- Never tag the format: no article, video, blog, tutorial, link, tweet.
- Prefer tags that will also fit other pages on the same topic, so related bookmarks cluster together.
"""

# ---------------------------------------------------------------------------
# 3. Download a page and reduce it to readable text
# ---------------------------------------------------------------------------


def fetch_text(url: str) -> str:
    response = requests.get(
        url,
        timeout=settings.request_timeout,
        # Some sites return an error page to clients with no User-Agent.
        headers={"User-Agent": "Mozilla/5.0 (compatible; BrainlyEnricher/1.0)"},
    )
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    # Remove page furniture so the model sees the article, not the menus.
    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "form"]):
        tag.decompose()

    # Most articles live inside <article> or <main>. Fall back to the whole body.
    body = soup.find("article") or soup.find("main") or soup.body
    if body is None:
        return ""

    text = body.get_text(separator="\n", strip=True)
    return text[: settings.max_text_chars]


def get_text_for(doc: dict) -> tuple[str, str]:
    """
    Return (text, note) for one bookmark. Never raises.

    A page we cannot fetch is still worth summarising from its title - the same
    fallback already used for images and videos. Aborting the item instead
    would leave it with no summary, and so invisible to retrieval in Phase 1.
    """
    doc_type = doc.get("type", "link")

    if doc_type in NO_TEXT_TYPES:
        return "", f"type '{doc_type}' has no page text"

    try:
        text = fetch_text(doc.get("link", ""))
    except Exception as error:
        return "", f"fetch failed: {type(error).__name__}"

    if len(text) < MIN_USEFUL_TEXT:
        return "", f"only {len(text)} chars found (boilerplate?)"

    return text, ""


# ---------------------------------------------------------------------------
# 4. Ask the model for a summary and tags
# ---------------------------------------------------------------------------


def summarise(title: str, url: str, text: str) -> Enrichment:
    completion = openai_client.chat.completions.parse(
        model=settings.openai_model,
        response_format=Enrichment,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Saved title: {title}\n"
                    f"URL: {url}\n\n"
                    f"--- page text ---\n"
                    f"{text or '(no page text could be retrieved)'}"
                ),
            },
        ],
    )

    result = completion.choices[0].message.parsed
    if result is None:
        raise RuntimeError("model returned no parseable output")
    return result


# ---------------------------------------------------------------------------
# 5. Main loop
# ---------------------------------------------------------------------------


def main() -> None:
    client = MongoClient(settings.db_connection)
    try:
        db = client.get_default_database()
    except ConfigurationError:
        raise SystemExit(
            "DB_CONNECTION has no database name. It should end with the database, "
            "for example: mongodb+srv://user:pass@cluster.mongodb.net/brainly"
        )

    # Mongoose turns the model name "Content" into the collection "contents"
    # (lower-cased and pluralised), which is why this is not "Content".
    contents = db["contents"]

    total = contents.count_documents({})
    if total == 0:
        raise SystemExit(
            f"No documents in '{db.name}.contents'. Either DB_CONNECTION points at the "
            f"wrong database, or the collection has another name. Collections here: "
            f"{db.list_collection_names()}"
        )

    # Only pick up bookmarks that have not been enriched. This is what makes
    # re-running the script safe.
    pending = list(
        contents.find({"summary": {"$in": [None, ""]}}).limit(settings.batch_limit)
    )
    # $in with None also matches documents where the field is absent entirely,
    # which is the case for every bookmark saved before this script existed.

    if not pending:
        print(f"Nothing to enrich - all {total} bookmark(s) already have a summary.")
        return

    print(f"Enriching {len(pending)} bookmark(s) with {settings.openai_model}...\n")
    succeeded = 0
    title_only = 0

    for number, doc in enumerate(pending, start=1):
        title = doc.get("title", "(untitled)")
        link = doc.get("link", "")
        print(f"[{number}/{len(pending)}] {title}")

        try:
            text, note = get_text_for(doc)
            if note:
                print(f"    {note} - summarising from the title alone")

            enrichment = summarise(title, link, text)

            contents.update_one(
                {"_id": doc["_id"]},
                {
                    "$set": {
                        "summary": enrichment.summary,
                        "aiTags": enrichment.tags,
                        "extractedText": text or None,
                        # Lets Phase 1's eval separate "retrieval failed" from
                        # "this bookmark never had content to retrieve".
                        "textSource": "html" if text else "title-only",
                        "fetchNote": note or None,
                        "enrichedAt": datetime.now(timezone.utc),
                    }
                },
            )

            print(f"    summary: {enrichment.summary}")
            print(f"    tags:    {', '.join(enrichment.tags)}\n")
            succeeded += 1
            if not text:
                title_only += 1

        except Exception as error:
            print(f"    FAILED: {type(error).__name__}: {error}\n")

    print(
        f"Done. {succeeded} enriched"
        f" ({succeeded - title_only} from page text, {title_only} from title only),"
        f" {len(pending) - succeeded} failed."
    )
    client.close()


if __name__ == "__main__":
    main()
