"""
Phase 1: the naive RAG baseline.

Embed the question, find the nearest chunks with Atlas Vector Search, put them
in one prompt, print the answer with citations. No metadata filters, no query
rewriting, no self-correction - those are Phase 2, and leaving them out is what
makes this a baseline worth measuring against.

Run with:  .venv/Scripts/python ask.py "what did I save about job hunting?"

ask() returns a dict rather than printing, so eval.py can call it directly and
compare it against the later configurations on the same questions.
"""

import sys
import time

from bson import ObjectId
from pymongo.database import Database

from config import cost_usd, get_db, openai_client, settings

VECTOR_INDEX = "vector_index"

SYSTEM_PROMPT = """You answer questions about a user's saved bookmarks, using only the numbered excerpts provided.

- Answer from the excerpts alone. Never use outside knowledge.
- Cite the excerpts you used by number, like [2]. Cite every claim.
- If the excerpts do not contain the answer, say so plainly. Do not guess, and do not pad the answer with related information the user did not ask for.
- Be concise. Two or three sentences is usually enough."""


def resolve_user_id(db: Database) -> ObjectId:
    """Whose bookmarks to search."""
    users = db["users"]

    if settings.brainly_username:
        user = users.find_one({"username": settings.brainly_username}, {"_id": 1})
        if user is None:
            raise SystemExit(f"No user named {settings.brainly_username!r}")
        return user["_id"]

    # Development convenience: if there is only one user, use them.
    found = list(users.find({}, {"_id": 1}).limit(2))
    if len(found) == 1:
        return found[0]["_id"]
    raise SystemExit("Set BRAINLY_USERNAME in .env to choose which user to search")


def embed_question(question: str) -> tuple[list[float], int]:
    """Returns (vector, tokens_used)."""
    response = openai_client.embeddings.create(
        model=settings.embedding_model, input=question
    )
    return response.data[0].embedding, response.usage.total_tokens


def retrieve(db: Database, vector: list[float], user_id: ObjectId) -> list[dict]:
    """The top-k nearest chunks for this user."""
    pipeline = [
        {
            "$vectorSearch": {
                "index": VECTOR_INDEX,
                "path": "embedding",
                "queryVector": vector,
                "numCandidates": settings.top_k * 20,                           # Atlas scans numCandidates vectors approximately, then returns the best `limit`. Larger is more accurate and slower; 10-20x the limit is the usual guidance.
                "limit": settings.top_k,
                "filter": {"userId": user_id},                                  # Without this filter one user's question could retrieve another user's bookmarks. The field must be declared as a filter path in the Atlas index definition for this to work.
            }
        },
        {
            "$project": {
                "_id": 0,
                "text": 1,
                "title": 1,
                "link": 1,
                "source": 1,
                "textSource": 1,
                "score": {"$meta": "vectorSearchScore"},
            }
        },
    ]
    return list(db["chunks"].aggregate(pipeline))


def build_context(hits: list[dict]) -> str:
    blocks = []
    for number, hit in enumerate(hits, start=1):
        blocks.append(f"[{number}] {hit['title']}\n{hit['text']}")
    return "\n\n".join(blocks)


def ask(question: str, db: Database, user_id: ObjectId) -> dict:
    """Answer one question. Returns answer, sources, latency and cost."""
    started = time.perf_counter()

    vector, embed_tokens = embed_question(question)
    hits = retrieve(db, vector, user_id)

    if not hits:
        return {
            "question": question,
            "answer": "Nothing in your bookmarks matched that.",
            "sources": [],
            "latency_ms": (time.perf_counter() - started) * 1000,
            "cost_usd": cost_usd(settings.embedding_model, embed_tokens),
        }

    completion = openai_client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Question: {question}\n\nExcerpts:\n\n{build_context(hits)}",
            },
        ],
    )

    usage = completion.usage
    total_cost = cost_usd(settings.embedding_model, embed_tokens) + cost_usd(
        settings.openai_model, usage.prompt_tokens, usage.completion_tokens
    )

    return {
        "question": question,
        "answer": completion.choices[0].message.content or "",
        "sources": [
            {
                "title": hit["title"],
                "link": hit["link"],
                "score": hit["score"],
                "source": hit["source"],
            }
            for hit in hits
        ],
        "latency_ms": (time.perf_counter() - started) * 1000,
        "cost_usd": total_cost,
    }


def main() -> None:
    question = " ".join(a for a in sys.argv[1:] if not a.startswith("--"))
    if not question:
        raise SystemExit('Usage: python ask.py "your question"')

    db = get_db()
    result = ask(question, db, resolve_user_id(db))

    print(f"\n{result['answer']}\n")

    if result["sources"]:
        print("Sources:")
        for number, source in enumerate(result["sources"], start=1):
            score = source["score"]
            print(f"  [{number}] {score:.3f}  {source['title'][:56]}")
            print(f"       {source['link'][:90]}")

    latency = result["latency_ms"]
    print(f"\n{latency:.0f} ms, ${result['cost_usd']:.5f}")
    db.client.close()


if __name__ == "__main__":
    main()
