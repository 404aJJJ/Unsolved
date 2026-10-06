# API notes (operations and gotchas)

Companion to [api.md](api.md) (the contract) and [deploy-vultr.md](deploy-vultr.md) (the steps). This is what to know when running or changing the live API.

## Live setup
- **API today:** Vultr Cloud Compute, Docker compose: Caddy (HTTPS) → one container running `server/main.py` (FastAPI). Address: `https://45-76-235-124.sslip.io` (the server IP `45.76.235.124` written as an `sslip.io` name so Caddy can get a certificate without owning a domain).
- **Where it is going:** one Vercel project serves the site and the same FastAPI app (`vercel.json` services). Player data moves from the SQLite volume to Neon Postgres. See [deploy-vultr.md](deploy-vultr.md). The existing project (root directory `web`) still proxies `/api` to Vultr via `web/vercel.json`. Switch that root directory only after `DATABASE_URL` and `UNSOLVED_CASE_JSON` are set, or the live site loses its API.
- **Check it any time:** `bash deploy/smoke-test.sh https://45-76-235-124.sslip.io` (17 checks, no secrets needed).

## Operating it (on the server, in `~/Unsolved`)
| Task | Command |
|---|---|
| Update to the latest code | `git pull && sudo bash deploy/setup-vultr.sh` (keeps the domain from `deploy/.env`) |
| Logs | `docker compose -f deploy/docker-compose.yml logs --tail=100 app` (Caddy: `... logs caddy`) |
| Restart | `docker compose -f deploy/docker-compose.yml restart app` |
| Change a key (`.env`) | edit `.env`, then `sudo bash deploy/setup-vultr.sh` |
| Is a feature on? | `curl -s http://127.0.0.1/api/config` |
| Back up player data | `docker run --rm -v deploy_unsolved-data:/d -v "$PWD":/b alpine tar czf /b/players.tgz -C /d .` (volume name may differ: `docker volume ls`) |

## If the HTTPS address stops answering
Symptom: the smoke test shows `000` for every check, `curl http://<server-ip>/api/health` still works, and port 443 is closed. Cause: Caddy was restarted without `DOMAIN`, so it fell back to plain http on port 80 and the Vercel rewrite (which needs HTTPS) breaks. Fix on the server: `cd ~/Unsolved && git pull && sudo bash deploy/setup-vultr.sh 45-76-235-124.sslip.io`. This writes `deploy/.env` so it cannot happen again.

## A second name for networks that block the new domain
UTSA's campus DNS answers `NXDOMAIN` for `unsolved.work` (its answers carry no SOA record, which points to a filter on newly registered domains, not ordinary caching), while `45-76-235-124.sslip.io` resolves there. Caddy can serve both names: `sudo bash deploy/setup-vultr.sh unsolved.work 45-76-235-124.sslip.io` (the second argument is saved in `deploy/.env` as `ALT_DOMAIN`). Use the sslip name for demos on campus Wi-Fi.

## Behaviour worth knowing
- **One game per browser.** A random `uid` cookie (30 days, HttpOnly, Secure over https) keys progress and the notebook in SQLite (`/data/game.sqlite3` in the container). Clearing cookies or switching browser starts a fresh game on the server; the site's local save is separate.
- **Secrets are only in `.env` and `case-private.json` on the server.** Neither is in git or the image. Without `case-private.json`: unlock and progress return 503. Without a real `GEMINI_API_KEY`: reports are still graded, with `theory.source: "offline"`. Without `ELEVEN_LABS_API_KEY`: `/api/narrate` returns 503 and the site falls back to the browser voice. `insert_...` placeholders count as "not set".
- **Final reports.** `/api/accuse` is final and always explains the case, right or wrong. The 30:00 timer is client-side; on timeout the site posts the draft with `timedOut: true`.
- **Gemini model.** Default `gemini-3.5-flash-lite` (older `2.5` names return 404 for new keys). Override with `GEMINI_MODEL`. The server logs the HTTP status and reason when Gemini fails; the player just sees an offline result.
- **Caches and rate limits are in memory.** Theory and narration caches and the per-IP limits (12 reports/min, 20 narrations/min) reset when the container restarts. Behind Caddy and Vercel the client IP comes from `X-Forwarded-For`; expect players behind one proxy to share a bucket.
- **Sample case.** `server/sample/case-sample.json` is a fake case (different culprit, answers and record mapping from the real one; a test enforces that). The Python server only falls back to it when `UNSOLVED_ALLOW_SAMPLE=1` and the real file is absent, which `run-dev.sh` sets. Never set it on the public server: without it a missing case file correctly fails with 503.
- **Developer shortcuts are off.** `UNSOLVED_DEV` (the `/api/dev/*` Test Lab routes) and `UNSOLVED_TEST_PREVIEW` (the `?preview=true` image bypass) default to `0`, and compose pins both to `"0"`. The smoke test fails if either is on. The Test Lab itself exists only on the dev server.
- **Evidence images.** All five are WebP (about 110-160 KB each; the PNG originals were about 1 MB). 01 and 02 are public: the site loads them as static files from `web/public/evidence/` (Vercel CDN, cached a day); `/api/files/01|02/image` still works and must stay identical. 04, 05 and 06 are locked: they only come from `/api/files/{id}/image`, return 403 until that player unlocks them, and are never cached (`no-store`). Never move the locked ones to a CDN or static folder; that makes them public.
- **Single server.** SQLite on one volume is plenty for a demo. Destroying the server or running `docker compose down -v` deletes player data.
- **Let's Encrypt and sslip.io.** `sslip.io` is a shared domain, so certificate rate limits are shared too. If issuance fails, retry later or point a real domain at the server and rerun `setup-vultr.sh <domain>`.

## Changing the API
1. Update `docs/api.md` first, then `server/` and the mock in `web/dev-api/` (keep them in sync; the mock exists so `npm run dev` works without Python).
2. Add a test in `server/tests/` (`server/.venv/bin/python -m unittest discover -s server/tests`; 47 tests today).
3. Never put answers, the solution, the rubric or API keys in the client code or `VITE_*` variables.
4. After deploying, run the smoke test.

## Known gaps
- Narration is untested against real ElevenLabs audio (no key was set while building).
- The Docker image was built for the first time on the Vultr server; there is no CI yet.
- Nothing rate-limits `/api/unlock`; wrong guesses are free by design (hints, no lockout), so a script could brute-force a four-digit PIN. If that matters, add a per-player delay after N wrong answers.

## Open question for Bad-Alex (and his agent): reveal the answer on a wrong report, or ask the player to replay?
James asked for this to be raised with you; nothing here is decided, and please do not change behaviour until James confirms.

**Today** (`server/accuse.py`, contract in `api.md`): filing a report is final. Whatever the player files, the response always includes the real culprit id (`culprit`) and the full explanation (`explanation`), and Gemini's feedback explains what the records actually show. A wrong accusation gets "Case unsolved", the correct culprit, and the chain of reasoning. The frontend (`web/src/apps/ReportApp.tsx`) then shows the result and "Play again" (clears server progress via `/api/progress/reset`).

**The question:** if the player is wrong, should the server **hide the answer** and invite them to replay or try again, instead of revealing it?

- **Option A, reveal (current).** Pros: matches the story-bible rule that the ending explains the reasoning chain; satisfies a player who is stuck; simple; no replay-value cost on a one-case demo. Cons: a replaying player already knows the culprit and the lock answers are the only puzzle left; the answer is exposed to anyone who files one throwaway report.
- **Option B, hide on wrong, allow retry.** Return only that the report is wrong (no `culprit`, no `explanation`) and let the player keep investigating. Reveal only on a correct report or when they give up. Pros: preserves the puzzle and replay value; the early-version design ("no steering, soft credibility penalty, no game over") fits it. Cons: needs a retry counter and some give-up path so nobody is stuck forever; can be brute-forced (six suspects) unless attempts cost something (a score penalty per attempt, or a short cooldown, per player via the `uid` cookie); the timed mode and leaderboard need a rule for retries.
- **Option C, hybrid.** Reveal the explanation but not the culprit's name until the second wrong attempt, or reveal everything only after a "Give up" confirmation.

**What I (James's agent) would need from you if B or C is chosen:** (1) server-side attempt counting per `uid` in the existing SQLite database, (2) `/api/accuse` returning `verdict: "incorrect"` without `culprit` or `explanation` until the reveal condition is met, (3) a give-up endpoint or flag, (4) a note in `api.md` so the frontend and mock (`web/dev-api/accuse.ts`) stay in sync. Please reply by proposing which option you prefer and why, and flag any server-side reason (abuse, cost, cheating) that I may have missed. Until then the live server keeps Option A.

