# API contract (v0)

The frontend talks to this API only. The reference implementation is the Python server `server/main.py` (see `server/README.md` and `docs/deploy-vultr.md`); it implements every endpoint below. For frontend-only work `npm run dev` serves the same endpoints from a mock in `web/dev-api/` (in-memory game, no Python needed). To develop against the Python server set `API_PROXY_TARGET=http://localhost:8000` (see `docs/integrations.md`).

**Players and sessions.** The server gives each browser a random `uid` cookie (HttpOnly, SameSite=Lax, Secure over https) and keeps that player's unlocked files and notebook separately. The site and API must share an origin (the Docker deploy and the Vite proxy both do), so images and cookies just work.

`GET /api/health` returns `200 { "ok": true }`. Interactive API documentation is available at `/docs` on the Python server. Invalid request bodies return HTTP 422.

Content shapes (`FileDoc`, `Block`, etc.) are defined in `web/src/content/types.ts`.

## `GET /api/config`
What the backend can do right now. The client reads it on load and hides or degrades any feature whose flag is false. A backend that does not implement it (404) is treated as online with every flag off.

Response `200`
```json
{ "features": { "narration": true, "gradingAI": true } }
```
- `narration`: `POST /api/narrate` works (ElevenLabs key set). When false the client reads text aloud with the browser's own voice.
- `gradingAI`: Gemini grades the written theory. When false, `/api/accuse` returns `theory.source: "offline"` and the player sees a static explanation.
- Add new flags here as integrations land (hints, interrogation, ...); the client ignores unknown ones.

## `POST /api/narrate`
Character speech through ElevenLabs, **one voice per character**. Only characters are voiced: chat messages, interview statements and emails written by a character. Case documents, logs, reports and the verdict are never narrated. Nothing plays automatically; the player presses **Listen**.

Request
```json
{ "speaker": "mw", "text": "what that character says, max 2500 characters" }
```
- `speaker` is one of `mw`, `nb`, `aw`, `bm`, `ow`, `lj` (the six suspects, as on the Case Board), `supervisor` or `friend` (the other people in the chat logs). The server maps it to that character's ElevenLabs voice in `server/voices.json`. Anything else is `400 Unknown speaker`.
- The site sends one request per line of dialogue (a chat message, or one person's interview statement) and prefetches the next while the current one plays, so a conversation flows without gaps.

Response `200`: `audio/mpeg` (binary body, not JSON).

Errors (JSON `{ "error": "..." }`): `400` unknown speaker or empty text, `413` text over 2500 characters, `429` more than 40 requests a minute per client, `502` ElevenLabs failed (including a voice not available to the account), `503` narration not configured.
- The client falls back to the browser voice (pitch varied per character) for the rest of that reading on any error, so the backend should fail fast with a clear status and never block the game.
- The key and model live only on the server (`ELEVEN_LABS_API_KEY`, optional `ELEVEN_LABS_MODEL`); voices are in `server/voices.json`, and `ELEVEN_LABS_VOICE_<SPEAKER>` (for example `ELEVEN_LABS_VOICE_MW`) overrides one. Cache audio server-side by hash of (voice, model, text); the client also caches in memory per session.
- Every voice ID must be available to the ElevenLabs account the key belongs to (added under *My Voices* if it comes from the Voice Library). Dev check: the Test Lab's "Character voices" panel, or `python -m server.narrate`, prints what ElevenLabs reports for each voice (name, gender, accent).
- Only text the player can already read is ever sent, so narration cannot reveal anything locked.

## `POST /api/unlock`
Validate an access reference for a locked file (`04`, `05`, `06`).

Request
```json
{ "fileId": "04", "answer": "1234", "attempt": 1 }
```
- `attempt` is the 1-based attempt number; it selects how many hints to return.

Responses
- Correct: `200 { "ok": true, "file": FileDoc }`
- Wrong: `200 { "ok": false, "hints": ["hint 1", "..."] }`, one more hint per attempt up to the ladder length; never a lockout
- Unknown file: `404 { "error": "unknown file" }`
- Server data missing: `503 { "error": "..." }`

Rules: trim whitespace, compare case-insensitively, numeric answers are four-digit strings. A correct unlock saves the internal file ID in the player's rows in `server/private/game.sqlite3`. Saved unlocked content is also returned by GET `/api/progress`.

## `POST /api/accuse`
Final report: culprit, up to three cited records, and a written theory. **Filing is final**: every submission is graded and explained, right or wrong. There is no retry loop and no steering; the player is told how it really happened.

Request
```json
{ "culprit": "nb", "evidence": ["04", "02", "06"], "theory": "free text, max 1500 chars", "timedOut": false }
```
- `timedOut` (optional) is true when the 30:00 limit ran out and the site files the draft automatically. Only then may `culprit` be empty (no one accused: verdict `incorrect`, rating `Out of time` unless solved) and the theory be blank. The grader is told the report was filed because time ran out.
- `culprit` is a suspect id (`mw`, `nb`, `aw`, `bm`, `ow`, `lj`); `evidence` is a list of at most three API file ids, in any order.

Response `200`
```json
{
  "ok": true,
  "verdict": "solved | partial | incorrect",
  "score": 0,
  "rating": "Master Detective | Detective | Inspector | Right suspect, thin case | Case unsolved",
  "culprit": "mw",
  "theory": { "graded": true, "score": 0, "feedback": "...", "source": "gemini | offline" },
  "explanation": ["the real chain of reasoning, always returned"]
}
```
- `solved`: right culprit and the cited records support the whole case. `partial`: right culprit, records do not establish the case. `incorrect`: wrong culprit (the real culprit id is returned so the UI can say who it was).
- The Gemini feedback is told the accused suspect, the cited records and whether the accusation was right. For a wrong accusation it says so plainly and explains what the records actually show; offline, the static `explanation` does that job.
- Scoring: culprit 40, each of three supported claims 15 (best) or 8 (acceptable), theory 15 (Gemini score/100). If the theory is not graded, the other 85 points are scaled to 100.
- Errors: `400` no suspect, `429` more than 12 requests a minute per client, `503` private data missing.

Gemini grading (server only)
- Key in the repo-root `.env` as `GEMINI_API_KEY` (never `VITE_`); optional `GEMINI_MODEL` (default `gemini-3.5-flash-lite`) and `GEMINI_BASE_URL`.
- The secret rubric goes in the system instruction. The player theory is wrapped in `<player_theory>` tags and declared untrusted data. Output is forced to `{ score, feedback }` JSON, then validated and clamped; theories under 80 characters are capped at 60.
- Results are cached per theory text. Any failure (no key, timeout, bad JSON, HTTP error) falls back to `source: "offline"` and the rest of the report is still graded.
- The solution and rubric live in the gitignored `server/private/case-private.json` under `solution`.

Dev only, enabled with `UNSOLVED_DEV=1` (never on the public server; the Test Lab that uses them is excluded from production builds): `GET /api/dev/files` returns every record, `GET /api/dev/scenarios` returns canned reports from `devScenarios` in the private file, `GET /api/dev/status` reports whether the secrets are configured, and `GET /api/dev/voices` asks ElevenLabs about each character voice. The Test Lab (dev server only) has buttons that exercise `/api/config` and `/api/narrate`.

## Image endpoints

GET `/api/files/01/image` and `/api/files/02/image` return public WebP images. The website itself loads these two from static files (`web/public/evidence/`, served by Vercel's CDN), so the endpoints are a fallback; keep the files identical.
GET `/api/files/04/image`, `/api/files/05/image`, and `/api/files/06/image`
return Security Logs, Diamond Examination Report, and Purchase Records. They
check saved unlock progress and return HTTP 403 while locked, or HTTP 404 if the
image is missing. Responses are `image/webp` (converted from the original PNG scans, about 90% smaller); locked images use `Cache-Control: no-store`.

Developer testing: `?preview=true` skips the lock without saving progress, but only when
`UNSOLVED_TEST_PREVIEW=1`. It is **off by default** and must stay off in production.

## Progress endpoints

GET `/api/progress` returns `{ "unlocked": { "05": FileDoc } }`, including only
saved unlocked records. React reads this on login to reconcile its local cache.
POST `/api/progress/reset` saves an empty list and returns `{ "ok": true }`.
Read/write failures return HTTP 503. Progress is per player (see sessions above); attempts and elapsed time are stored in the browser. The notebook
now uses SQLite as described below; attempts and elapsed time remain local.

## Notebook endpoints

GET `/api/notes` returns `{ "text": "saved writing" }` or `{ "text": null }` before
the first save. PUT `/api/notes` accepts `{ "text": "new writing" }` (a string up to
100,000 characters) and returns `{ "ok": true }`. Empty strings clear the writing.
Invalid input returns HTTP 422; database failures return HTTP 503. The frontend
loads when Notes opens and saves with the Save notes button. POST
`/api/progress/reset` also clears the notebook. SQLite data lives in the ignored
`server/private/game.sqlite3` file.
