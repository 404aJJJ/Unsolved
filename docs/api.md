# API contract (v0)

The frontend talks to this API only. During development the Vite dev server serves a mock of it (`web/vite.config.ts`) backed by the gitignored `server/private/case-private.json`. The FastAPI backend must implement the same shapes; point the client at it with `VITE_API_URL`.

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
Text to speech through ElevenLabs. Used for the case brief, evidence documents, emails, chats and the verdict.

Request
```json
{ "text": "plain text to read aloud, max 2500 characters" }
```
Response `200`: `audio/mpeg` (binary body, not JSON).

Errors (JSON `{ "error": "..." }`): `400` empty text, `413` text over 2500 characters, `429` more than 20 requests a minute per client, `502` ElevenLabs failed, `503` narration not configured.
- The client splits long documents into chunks of at most 2500 characters on sentence boundaries and plays them in order, so the backend never sees more than one chunk per request.
- The client falls back to the browser voice on any error, so the backend should fail fast with a clear status and never block the game.
- The voice, model and key live only on the server (`ELEVEN_LABS_API_KEY`, optional `ELEVEN_LABS_VOICE_ID`, `ELEVEN_LABS_MODEL`). Cache audio server-side by hash of (voice, model, text); the client also caches in memory per session.
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

Rules: trim whitespace, compare case-insensitively, numeric answers are four-digit strings. Locked file content is only ever returned from a correct unlock.

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

Dev only (the real backend must not expose these; the Test Lab that uses them is excluded from production builds): `GET /api/dev/files` returns every record, `GET /api/dev/scenarios` returns canned reports from `devScenarios` in the private file, `GET /api/dev/status` reports whether the secrets are configured. The Test Lab (dev server only) has buttons that exercise `/api/config` and `/api/narrate`.

## Planned
- Optional: `GET /api/session` if unlocked state moves server-side.
