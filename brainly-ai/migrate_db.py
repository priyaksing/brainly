"""
One-off migration: copy collections from the `test` database to `brainlyDB`.

Why this is needed: brainly-backend's connection string sets `appName=brainlyDB`
but leaves the database path empty ("...mongodb.net/?appName=brainlyDB").
`appName` is only a label for logs and Atlas monitoring - the database name is
the path segment before the "?". With it empty, Mongoose fell back to its
default database, `test`, and every bookmark has been written there.

This script COPIES documents. It never deletes or moves anything, so your
original data stays in `test` until you choose to drop it yourself.

Indexes are not copied. Mongoose recreates them from your schema definitions
when the backend connects (autoIndex is on by default), which covers the unique
constraints on users.username, tags.title and links.hash.

Usage:
    .venv/Scripts/python migrate_db.py --dry-run    # show what would happen
    .venv/Scripts/python migrate_db.py              # actually copy
"""

import os
import sys

from dotenv import load_dotenv
from pymongo import MongoClient, ReplaceOne

SOURCE_DB = "test"  # where Mongoose accidentally wrote
TARGET_DB = "brainlyDB"  # where we want the data to live

COLLECTIONS = ["users", "contents", "tags", "links"]


def main() -> None:
    dry_run = "--dry-run" in sys.argv

    # Read the URI directly rather than importing enrich.py, which would also
    # build an OpenAI client this script has no use for.
    load_dotenv()
    uri = os.environ.get("DB_CONNECTION")
    if not uri:
        raise SystemExit("DB_CONNECTION is not set in .env")

    client = MongoClient(uri)
    source = client[SOURCE_DB]
    target = client[TARGET_DB]
    # Note: we name both databases explicitly above, so whatever database the
    # URI's path points at makes no difference to this script.


    for name in COLLECTIONS:
        docs = list(source[name].find({}))
        already_there = target[name].count_documents({})

        if not docs:
            print(f"  {name:10} source is empty, nothing to copy")
            continue


        if dry_run:
            print(f"  {name:10} would copy {len(docs)} document(s)")
            continue

        # Match on _id and replace, creating the document if it isn't there yet.
        # Re-running then tops up with whatever is new instead of skipping, and
        # can never duplicate a document, because _id is the match key.
        result = target[name].bulk_write(
            [ReplaceOne({"_id": d["_id"]}, d, upsert=True) for d in docs]
        )
        print(
            f"  {name:10} {result.upserted_count} new,"
            f" {result.modified_count} updated ({len(docs)} seen)"
        )

    # Verify: the two columns should match for every collection.
    print(f"\n{'collection':12} {SOURCE_DB:>8} {TARGET_DB:>10}")
    print("-" * 32)
    for name in COLLECTIONS:
        print(
            f"{name:12} {source[name].count_documents({}):>8}"
            f" {target[name].count_documents({}):>10}"
        )

    client.close()


if __name__ == "__main__":
    main()
