"""POST /api/accuse: close the case from the suspect and the cited records.

The solution lives in the gitignored case file (`solution` block) and stays on the server
until a report is filed. The verdict is an exact match against that solution.
"""
import time

CLAIMS = ("opportunity", "falseAlibi", "replica")
MAX_RECORDS = 3

_hits = {}


def rate_limited(key, limit=12, window=60):
    now = time.monotonic()
    recent = [t for t in _hits.get(key, []) if now - t < window]
    recent.append(now)
    _hits[key] = recent
    return len(recent) > limit


def handle_accuse(culprit, evidence, timed_out, solution):
    picked = list(dict.fromkeys(str(e) for e in evidence))[:MAX_RECORDS]
    culprit_correct = culprit == solution["culprit"]

    supported = True
    for claim in CLAIMS:
        rule = solution["claims"][claim]
        has_best = any(i in picked for i in rule["best"])
        has_ok = any(i in picked for i in rule["ok"])
        if not has_best and not has_ok:
            supported = False

    verdict = ("solved" if supported else "partial") if culprit_correct else "incorrect"
    if timed_out and verdict != "solved":
        rating = "Out of time"
    elif verdict == "incorrect":
        rating = "Case unsolved"
    elif verdict == "partial":
        rating = "Right suspect, thin case"
    else:
        rating = "Case solved"

    return {
        "ok": True,
        "verdict": verdict,
        "rating": rating,
        "culprit": solution["culprit"],
        "explanation": solution["chain"],
    }
