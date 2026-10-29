"""
Bulk-import bookmarks through the existing backend API.

Takes either a browser bookmark export (.html) or a plain list of URLs (.txt,
one per line) and POSTs each one to /api/v1/content. Going through the API
rather than writing to MongoDB directly means every bookmark passes the same
Zod validation and gets the same shape as one added through the dashboard.

Requires the backend to be running.

Usage:
    .venv/Scripts/python import_bookmarks.py bookmarks.html --dry-run
    .venv/Scripts/python import_bookmarks.py bookmarks.html
    .venv/Scripts/python import_bookmarks.py urls.txt --limit 20

Safe to re-run: it fetches your existing bookmarks first and skips any URL
already saved, so you cannot create duplicates.
"""

import os
import sys
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:3000")
USERNAME = os.environ.get("BRAINLY_USERNAME")
PASSWORD = os.environ.get("BRAINLY_PASSWORD")

# Must match CONTENT_TYPES in brainly-backend/src/db.ts
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg")
VIDEO_EXTENSIONS = (".mp4", ".webm", ".mov")


def guess_type(url: str) -> str:
    """Pick a content type from the URL, since a bookmark export doesn't say."""
    host = urlparse(url).netloc.lower().removeprefix("www.")
    path = urlparse(url).path.lower()

    if host in ("youtube.com", "youtu.be", "m.youtube.com"):
        return "youtube"
    if host in ("twitter.com", "x.com"):
        return "twitter"
    if host in ("vimeo.com", "dailymotion.com") or path.endswith(VIDEO_EXTENSIONS):
        return "video"
    if path.endswith(IMAGE_EXTENSIONS):
        return "image"
    return "article"


def read_bookmarks(path: str) -> list[dict]:
    """Read (title, link) pairs from a browser export or a plain URL list."""
    with open(path, encoding="utf-8", errors="replace") as handle:
        raw = handle.read()

    found = []

    if path.lower().endswith((".html", ".htm")):
        # Browser exports use the Netscape format: <DT><A HREF="...">Title</A>
        soup = BeautifulSoup(raw, "html.parser")
        for anchor in soup.find_all("a"):
            href = anchor.get("href", "")
            if href.startswith(("http://", "https://")):
                found.append({"link": href, "title": anchor.get_text(strip=True)})
    else:
        for line in raw.splitlines():
            url = line.strip()
            if url.startswith(("http://", "https://")):
                found.append({"link": url, "title": ""})

    # A title is required by the API, so fall back to the hostname.
    for item in found:
        title = item["title"] or urlparse(item["link"]).netloc
        item["title"] = title[:200]  # API caps title at 200 characters

    return found


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        raise SystemExit("Usage: python import_bookmarks.py <bookmarks.html|urls.txt> [--dry-run] [--limit N]")

    source_file = args[0]
    dry_run = "--dry-run" in sys.argv
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])

    if not USERNAME or not PASSWORD:
        raise SystemExit("Set BRAINLY_USERNAME and BRAINLY_PASSWORD in .env")

    bookmarks = read_bookmarks(source_file)
    print(f"Found {len(bookmarks)} URL(s) in {source_file}")

    # Sign in. Note: authMiddleware expects the raw token, NOT "Bearer <token>".
    response = requests.post(
        f"{BACKEND_URL}/api/v1/signin",
        json={"username": USERNAME, "password": PASSWORD},
        timeout=15,
    )
    if response.status_code != 200:
        raise SystemExit(f"Sign-in failed ({response.status_code}): {response.text}")
    headers = {"Authorization": response.json()["token"]}

    # Skip anything already saved, so re-running cannot create duplicates.
    existing = requests.get(f"{BACKEND_URL}/api/v1/content", headers=headers, timeout=15)
    already_saved = {c["link"] for c in existing.json().get("contents", [])}
    print(f"You already have {len(already_saved)} bookmark(s) saved\n")

    added = skipped = failed = 0

    for item in bookmarks:
        if limit is not None and added >= limit:
            print(f"\nReached --limit {limit}, stopping.")
            break

        if item["link"] in already_saved:
            skipped += 1
            continue

        payload = {
            "link": item["link"],
            "title": item["title"],
            "type": guess_type(item["link"]),
        }

        if dry_run:
            print(f"  would add [{payload['type']:8}] {payload['title'][:60]}")
            added += 1
            continue

        result = requests.post(
            f"{BACKEND_URL}/api/v1/content", json=payload, headers=headers, timeout=15
        )

        if result.status_code == 201:
            print(f"  added [{payload['type']:8}] {payload['title'][:60]}")
            added += 1
        else:
            # Most likely a URL that fails Zod's .url() check.
            print(f"  FAILED ({result.status_code}) {item['link'][:60]}: {result.text[:120]}")
            failed += 1

    verb = "would add" if dry_run else "added"
    print(f"\n{verb} {added}, skipped {skipped} already saved, {failed} failed.")


if __name__ == "__main__":
    main()
