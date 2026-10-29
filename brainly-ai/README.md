# brainly-ai

Gen AI service for Brainly. Runs as a **separate service** from
`brainly-backend`, sharing the same MongoDB Atlas cluster.

Why separate: AI work has different dependencies (Python, OpenAI, LangChain),
different scaling behaviour (slow, expensive, external API calls) and different
failure modes from a CRUD API. Keeping them apart means a slow enrichment run
can never make the bookmarks API slow.

## Stage 0 - enrichment

A bookmark stores only a title and a URL. That is not enough to search through,
so `enrich.py` visits each page and writes back what it is about:

| Field | Example |
| --- | --- |
| `summary` | "Overview of Kleppmann's book on the architecture of data systems..." |
| `aiTags` | `["databases", "distributed-systems", "data-engineering"]` |
| `enrichedAt` | `2026-09-29T10:14:00Z` |

## Setup

**1. Create the virtual environment** (a per-project Python install, so these
packages never clash with anything else on your machine):

```bash
cd brainly-ai
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
```

**2. Create your `.env`:**

```bash
cp .env.example .env
```

Then fill in two values:

- `DB_CONNECTION` - copy from `brainly-backend/.env`. It must end with the
  database name (`.../brainly`), or the script will stop and tell you so.
- `OPENAI_API_KEY` - create one at https://platform.openai.com/api-keys.
  A new account needs a little credit added before the API will respond.

## Running it

```bash
.venv/Scripts/python enrich.py
```

It processes `BATCH_LIMIT` bookmarks (default 10) and prints each summary as it
goes, so you can judge the output before spending more. Raise `BATCH_LIMIT` in
`.env` once you are happy with it, and re-run until it reports nothing left.

**Safe to re-run.** The script only selects bookmarks with no `summary`, so
finished work is never repeated or paid for twice. This property is called
*idempotency* and it is the reason there is no "have I already run this?"
bookkeeping to get wrong.

Cost is roughly **$0.0002 per bookmark** with `gpt-4o-mini` - about 10 cents for
500 bookmarks.

## Known gaps

These are deliberate, not oversights. Each is a planned next increment:

| Gap | Why it is fine for now | Why it matters later |
| --- | --- | --- |
| No failure tracking | a failed bookmark simply retries next run | a permanently dead link retries forever, wasting time |
| No SSRF protection | this is a manual script, run by you, against your own bookmarks | once enrichment runs behind an API endpoint, a saved URL like `http://169.254.169.254/` could make the server read its own cloud credentials |
| No retries or backoff | transient failures get picked up on the next run | a run against a flaky site fails more than it needs to |
| Processes one at a time | fine for a few hundred bookmarks | slow for thousands |
| `aiTags` is separate from the backend's `tags` | avoids the `Tag` collection and duplicate-key handling entirely | two tag systems is not a design you would ship |

## Roadmap

- [x] **Stage 0** - enrichment, so there is content to search
- [ ] **Stage 1** - naive baseline: ask the model a question with no data at all
- [ ] **Stage 5** - evaluation harness (built early, so every later stage has a number attached)
- [ ] **Stage 1.5** - put every summary in the prompt, no retrieval
- [ ] **Stage 2** - RAG with embeddings and MongoDB Atlas Vector Search
- [ ] **Stage 3** - self-correction loop with LangGraph
- [ ] **Stage 4** - tools, then exposed over MCP
