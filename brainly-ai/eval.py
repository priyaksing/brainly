"""
Phase 1: evaluation harness.

Runs every question in evalset.jsonl through ask() and scores four things:

  exact match      every must_mention string appears in the answer. Strict on
                   purpose, so it reads lower than the judge - the gap between
                   them is itself informative.
  LLM judge        a stronger model compares the answer against the gold answer
                   and returns pass/fail plus a 1-5 score.
  retrieval recall of the bookmarks that should have been retrieved, how many
                   actually appeared in the top-k.
  latency and cost p50/p95 milliseconds, and dollars per query.

Run:  .venv/Scripts/python eval.py
      .venv/Scripts/python eval.py --limit 5          # cheap smoke test
      .venv/Scripts/python eval.py --out results/phase1.json

Per-question results are written to JSON so Phase 2 can be diffed against this
baseline, and so a bad score can be investigated rather than just noted.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from pydantic import BaseModel

from ask import ask, resolve_user_id
from config import cost_usd, get_db, openai_client, settings

EVALSET = Path("evalset.jsonl")

JUDGE_PROMPT = """You grade answers given by a question-answering system that searches a user's saved bookmarks.

You are given the question, the correct answer, and the system's answer. Decide whether the system's answer is correct.

- Judge on substance, not wording. Different phrasing of the same correct content passes.
- The answer must not contradict the correct answer, and must not add claims the correct answer does not support.
- Partial answers: if the correct answer names several things and the system named only some, that is a fail unless the question asked for only one.
- When the correct answer says nothing was saved on the topic, the system passes ONLY if it declines or states nothing matched. Offering a loosely related bookmark instead is a fail.

score: 1 = wrong or fabricated, 2 = mostly wrong, 3 = partially correct, 4 = correct with minor gaps, 5 = fully correct.
passed: true only for a score of 4 or 5.
reason: one short sentence."""


class Judgement(BaseModel):
    passed: bool
    score: int
    reason: str


def load_evalset(limit: int | None) -> list[dict]:
    if not EVALSET.exists():
        raise SystemExit(f"{EVALSET} not found")
    rows = [json.loads(line) for line in EVALSET.read_text(encoding="utf-8").splitlines() if line.strip()]
    return rows[:limit] if limit else rows


def exact_match(answer: str, must_mention: list[str]) -> bool | None:
    """True when every required string is present. None when nothing is required."""
    if not must_mention:
        return None
    low = answer.lower()
    return all(needle.lower() in low for needle in must_mention)


def retrieval_recall(sources: list[dict], expected: list[str]) -> float | None:
    """Fraction of the expected bookmarks that made it into the retrieved set."""
    if not expected:
        return None
    titles = " | ".join(s["title"].lower() for s in sources)
    found = sum(1 for fragment in expected if fragment.lower() in titles)
    return found / len(expected)


def judge(question: str, gold: str, answer: str) -> tuple[Judgement, float]:
    completion = openai_client.chat.completions.parse(
        model=settings.judge_model,
        response_format=Judgement,
        messages=[
            {"role": "system", "content": JUDGE_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Question: {question}\n\n"
                    f"Correct answer: {gold}\n\n"
                    f"System's answer: {answer}"
                ),
            },
        ],
    )
    result = completion.choices[0].message.parsed
    if result is None:
        raise RuntimeError("judge returned no parseable output")

    usage = completion.usage
    return result, cost_usd(settings.judge_model, usage.prompt_tokens, usage.completion_tokens)


def percentile(values: list[float], fraction: float) -> float:
    """Nearest-rank percentile. Plenty for 50 samples."""
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(int(fraction * len(ordered)), len(ordered) - 1)
    return ordered[index]


def mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def summarise(rows: list[dict]) -> dict:
    """Aggregate metrics for one group of results."""
    exacts = [r["exact_match"] for r in rows if r["exact_match"] is not None]
    recalls = [r["retrieval_recall"] for r in rows if r["retrieval_recall"] is not None]
    latencies = [r["latency_ms"] for r in rows]

    return {
        "n": len(rows),
        "exact_pct": 100 * mean([float(e) for e in exacts]) if exacts else None,
        "judge_pct": 100 * mean([float(r["judge_passed"]) for r in rows]),
        "judge_avg": mean([r["judge_score"] for r in rows]),
        "recall": mean(recalls) if recalls else None,
        "p50_ms": percentile(latencies, 0.50),
        "p95_ms": percentile(latencies, 0.95),
        "cost_per_query": mean([r["cost_usd"] for r in rows]),
    }


def format_row(label: str, m: dict) -> str:
    exact = f"{m['exact_pct']:6.1f}" if m["exact_pct"] is not None else "   n/a"
    recall = f"{m['recall']:8.2f}" if m["recall"] is not None else "     n/a"
    return (
        f"{label:10} {m['n']:>3} {exact} {m['judge_pct']:8.1f} {m['judge_avg']:11.2f}"
        f" {recall} {m['p50_ms']:8.0f} {m['p95_ms']:8.0f} {m['cost_per_query']:9.5f}"
    )


def main() -> None:
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])

    out_path = Path("results/phase1.json")
    if "--out" in sys.argv:
        out_path = Path(sys.argv[sys.argv.index("--out") + 1])

    questions = load_evalset(limit)
    db = get_db()
    user_id = resolve_user_id(db)

    print(f"Running {len(questions)} question(s)")
    print(f"  answer model: {settings.openai_model}, judge: {settings.judge_model}, top_k: {settings.top_k}\n")

    results = []
    judge_cost = 0.0

    for number, q in enumerate(questions, start=1):
        result = ask(q["question"], db, user_id)
        verdict, jcost = judge(q["question"], q["gold_answer"], result["answer"])
        judge_cost += jcost

        row = {
            "id": q["id"],
            "category": q["category"],
            "answerable": q["answerable"],
            "question": q["question"],
            "gold_answer": q["gold_answer"],
            "answer": result["answer"],
            "retrieved": [s["title"] for s in result["sources"]],
            "exact_match": exact_match(result["answer"], q["must_mention"]),
            "retrieval_recall": retrieval_recall(result["sources"], q["expected_titles"]),
            "judge_passed": verdict.passed,
            "judge_score": verdict.score,
            "judge_reason": verdict.reason,
            "latency_ms": result["latency_ms"],
            "cost_usd": result["cost_usd"],
        }
        results.append(row)

        mark = "PASS" if verdict.passed else "FAIL"
        print(f"[{number}/{len(questions)}] {q['id']:4} {mark} score={verdict.score} {q['question'][:58]}")

    # --- table ---
    header = (
        f"\n{'category':10} {'n':>3} {'exact%':>6} {'judge%':>8} {'judge_avg':>11}"
        f" {'recall':>8} {'p50 ms':>8} {'p95 ms':>8} {'$/query':>9}"
    )
    print(header)
    print("-" * len(header.strip()))

    for category in ("lookup", "multihop", "schema"):
        group = [r for r in results if r["category"] == category]
        if group:
            print(format_row(category, summarise(group)))

    print(format_row("ALL", summarise(results)))

    # --- hallucination rate: the whole point of the unanswerable questions ---
    probes = [r for r in results if not r["answerable"]]
    if probes:
        failed = [r for r in probes if not r["judge_passed"]]
        rate = 100 * len(failed) / len(probes)
        print(
            f"\nhallucination rate: {rate:.1f}%"
            f"  ({len(failed)} of {len(probes)} answered instead of declining)"
        )

    ask_cost = sum(r["cost_usd"] for r in results)
    print(f"eval cost: ${ask_cost + judge_cost:.4f}  (answers ${ask_cost:.4f} + judging ${judge_cost:.4f})")

    # --- worst failures, so a bad number is actionable ---
    worst = sorted(results, key=lambda r: r["judge_score"])[:5]
    print("\nlowest-scoring questions:")
    for r in worst:
        print(f"  {r['id']:4} score={r['judge_score']} {r['judge_reason'][:88]}")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(
            {
                "config": {
                    "name": "phase1-naive-rag",
                    "answer_model": settings.openai_model,
                    "judge_model": settings.judge_model,
                    "embedding_model": settings.embedding_model,
                    "top_k": settings.top_k,
                    "chunk_size": settings.chunk_size,
                    "chunk_overlap": settings.chunk_overlap,
                },
                "ran_at": datetime.now(timezone.utc).isoformat(),
                "summary": {
                    "all": summarise(results),
                    **{
                        c: summarise([r for r in results if r["category"] == c])
                        for c in ("lookup", "multihop", "schema")
                        if any(r["category"] == c for r in results)
                    },
                },
                "results": results,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"\nwrote {out_path}")
    db.client.close()


if __name__ == "__main__":
    main()
