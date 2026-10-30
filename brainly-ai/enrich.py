"""
Stage 0: bookmark enrichment.

A bookmark stores only a title and a URL, which is not enough to search
through later. This visits each saved page and writes back:

    summary        2 to 3 sentences describing what the page covers
    aiTags         3 to 5 topic tags, e.g. ["databases", "distributed-systems"]
    extractedText  the page text, which Phase 1 chunks and embeds
    textSource     "html" or "title-only" - how well grounded the item is
    enrichedAt     when we did this

Run with:  .venv/Scripts/python enrich.py

Safe to re-run: only bookmarks without a summary are picked up, so finished
work is never repeated or paid for twice.
"""

from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup
from pydantic import BaseModel

from config import get_db, openai_client, settings

# Shorter than this and we got boilerplate or a JavaScript shell, not content.
# Storing it would pollute the vector index in Phase 1.
MIN_USEFUL_TEXT = 200
NO_TEXT_TYPES = {"image", "video"}


class Enrichment(BaseModel):
    summary: str
    tags: list[str]


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


def fetch_text(url: str) -> str:
    response = requests.get(
        url,
        timeout=settings.request_timeout,
        headers={"User-Agent": "Mozilla/5.0 (compatible; BrainlyEnricher/1.0)"},            # Some sites return an error page to clients with no User-Agent.
    )
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "form"]):
        tag.decompose()

    body = soup.find("article") or soup.find("main") or soup.body
    if body is None:
        return ""

    text = body.get_text(separator="\n", strip=True)
    return text[: settings.max_text_chars]


def get_text_for(doc: dict) -> str:
    if doc["type"] in NO_TEXT_TYPES:
        return ""

    try:
        text = fetch_text(doc["link"])
    except Exception:
        return ""                                                               #Raising exception here would leave the bookmark with no summary at all

    return text if len(text) >= MIN_USEFUL_TEXT else ""


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


def main() -> None:
    db = get_db()

    # Mongoose lower-cases and pluralises the model name "Content".
    contents = db["contents"]

    total = contents.count_documents({})
    if total == 0:
        raise SystemExit(
            f"No documents in '{db.name}.contents'. Either DB_CONNECTION points at "
            f"the wrong database, or the collection has another name. "
            f"Collections here: {db.list_collection_names()}"
        )

    # $in with None also matches documents where the field is absent entirely.
    pending = list(
        contents.find({"summary": {"$in": [None, ""]}}).limit(settings.batch_limit)
    )

    if not pending:
        print(f"Nothing to enrich - all {total} bookmark(s) already have a summary.")
        return

    print(f"Enriching {len(pending)} of {total} with {settings.openai_model}\n")
    grounded = 0
    failed = 0

    for number, doc in enumerate(pending, start=1):
        title = doc["title"]
        link = doc["link"]
        counter = f"[{number}/{len(pending)}]"

        try:
            text = get_text_for(doc)
            enrichment = summarise(title, link, text)

            contents.update_one(
                {"_id": doc["_id"]},
                {
                    "$set": {
                        "summary": enrichment.summary,
                        "aiTags": enrichment.tags,
                        "extractedText": text or None,
                        "textSource": "html" if text else "title-only",
                        "enrichedAt": datetime.now(timezone.utc),
                    }
                },
            )

            source = f"html {len(text)}ch" if text else "title-only"
            tags = ", ".join(enrichment.tags)
            print(f"{counter} {source:14} {title[:38]:38} {tags}")
            grounded += bool(text)

        except Exception as error:
            failed += 1
            print(f"{counter} FAILED {type(error).__name__}: {error}")

    done = len(pending) - failed
    print(
        f"\nDone. {done} enriched"
        f" ({grounded} from page text, {done - grounded} title-only),"
        f" {failed} failed."
    )
    db.client.close()


if __name__ == "__main__":
    main()
