"""
Phase 1: chunk and embed enriched bookmarks so they can be searched by meaning.

Builds the `chunks` collection that ask.py queries. Each bookmark produces:

  - one chunk from its summary, so bookmarks with no page text are still
    findable (32 of 67 are title-only)
  - fixed-size overlapping chunks of extractedText, when it has any

Run with:  .venv/Scripts/python embed.py
           .venv/Scripts/python embed.py --rebuild    # re-embed everything

Safe to re-run: bookmarks that already have chunks are skipped.
"""

import sys
from datetime import datetime, timezone

from config import get_db, openai_client, settings

# Below this a chunk is a fragment carrying no useful signal.
CHUNK_MIN_CHARS = 50


def chunk_text(text: str, size: int, overlap: int) -> list[str]:
    """Split text into fixed-size windows that overlap by `overlap` characters.

    The overlap exists so a sentence spanning a boundary still appears whole in
    one of the two chunks. Without it, the split point silently destroys
    whatever idea straddled it.
    """
    if overlap >= size:
        raise ValueError("chunk_overlap must be smaller than chunk_size")

    pieces = []
    start = 0
    while start < len(text):
        piece = text[start : start + size].strip()
        if len(piece) >= CHUNK_MIN_CHARS:
            pieces.append(piece)
        start += size - overlap
    return pieces


def chunks_for(doc: dict) -> list[tuple[str, str]]:
    """Return (text, source) pairs to embed for one bookmark."""
    pieces = []

    summary = (doc.get("summary") or "").strip()
    if summary:
        pieces.append((summary, "summary"))

    # Note: the title is deliberately NOT prepended to each chunk. Adding
    # context to chunks measurably helps retrieval, which is exactly why it
    # belongs in Phase 2 - if Phase 1 is already optimised, the ablation has
    # nothing left to show.
    text = (doc.get("extractedText") or "").strip()
    for piece in chunk_text(text, settings.chunk_size, settings.chunk_overlap):
        pieces.append((piece, "text"))

    return pieces


def embed_all(texts: list[str]) -> tuple[list[list[float]], int]:
    """Embed a list of strings. Returns (vectors, tokens_used)."""
    vectors = []
    tokens = 0

    for start in range(0, len(texts), settings.embed_batch_size):
        batch = texts[start : start + settings.embed_batch_size]
        response = openai_client.embeddings.create(
            model=settings.embedding_model, input=batch
        )
        # The API returns results in the same order as the input.
        vectors.extend(item.embedding for item in response.data)
        tokens += response.usage.total_tokens

    return vectors, tokens


def main() -> None:
    rebuild = "--rebuild" in sys.argv

    db = get_db()
    contents = db["contents"]
    chunks = db["chunks"]

    if rebuild:
        removed = chunks.delete_many({}).deleted_count
        print(f"Rebuild: removed {removed} existing chunk(s)\n")
        already_embedded = set()
    else:
        already_embedded = set(chunks.distinct("contentId"))

    enriched = list(contents.find({"summary": {"$nin": [None, ""]}}))
    todo = [d for d in enriched if d["_id"] not in already_embedded]

    if not todo:
        print(
            f"Nothing to embed - all {len(enriched)} enriched bookmark(s) already "
            f"have chunks. Use --rebuild to redo them."
        )
        db.client.close()
        return

    print(f"Embedding {len(todo)} of {len(enriched)} bookmark(s) with {settings.embedding_model}\n")
    total_chunks = 0
    total_tokens = 0

    for number, doc in enumerate(todo, start=1):
        counter = f"[{number}/{len(todo)}]"
        pieces = chunks_for(doc)

        if not pieces:
            print(f"{counter} SKIPPED (no summary or text) {doc['title'][:40]}")
            continue

        vectors, tokens = embed_all([text for text, _ in pieces])

        records = []
        for index, (piece, vector) in enumerate(zip(pieces, vectors)):
            text, source = piece
            records.append(
                {
                    "contentId": doc["_id"],
                    "userId": doc["userId"],
                    "chunkIndex": index,
                    "source": source,
                    "text": text,
                    "embedding": vector,
                    # Denormalised so ask.py can cite a result without a second
                    # query. Goes stale if a title is edited - acceptable here,
                    # since --rebuild refreshes it.
                    "title": doc["title"],
                    "link": doc["link"],
                    "type": doc["type"],
                    "textSource": doc.get("textSource"),
                    "embeddedAt": datetime.now(timezone.utc),
                }
            )

        chunks.insert_many(records)
        total_chunks += len(records)
        total_tokens += tokens

        breakdown = f"{len(records)} chunks"
        print(f"{counter} {breakdown:12} {doc['title'][:48]}")

    # text-embedding-3-small is $0.02 per 1M tokens.
    cost = total_tokens / 1_000_000 * 0.02
    print(
        f"\nDone. {total_chunks} chunks from {len(todo)} bookmark(s), "
        f"{total_tokens:,} tokens, ${cost:.4f}."
    )
    print(f"Total chunks in collection: {chunks.count_documents({}):,}")
    db.client.close()


if __name__ == "__main__":
    main()
