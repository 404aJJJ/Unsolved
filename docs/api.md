# API contract (v0)

The frontend talks to this API only. The old Vite mock only handles unlock checks. The current frontend requires the Python API for images and saved progress. The Python implementation is `server/main.py`; see `server/README.md` to run it and point the client at it with `VITE_API_URL=http://localhost:8000`.

`GET /api/health` returns `200 { "ok": true }`. Interactive API documentation is available at `/docs` on the Python server. Invalid request bodies return HTTP 422.

Content shapes (`FileDoc`, `Block`, etc.) are defined in `web/src/content/types.ts`.

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

Rules: trim whitespace, compare case-insensitively, numeric answers are four-digit strings. A correct unlock saves the internal file ID in `server/private/progress.json`. Saved unlocked content is also returned by GET `/api/progress`.

## Planned
- `POST /api/accuse`: culprit, evidence per claim (opportunity, false alibi, matching replica), free-text theory; returns verdict, per-claim feedback and the reasoning-chain explanation. Gemini grading with a dropdown/exact-match fallback.

## Image endpoints

GET `/api/files/01/image` and `/api/files/02/image` return public PNGs.
GET `/api/files/04/image`, `/api/files/05/image`, and `/api/files/06/image`
return Security Logs, Diamond Examination Report, and Purchase Records. They
check saved unlock progress and return HTTP 403 while locked, or HTTP 404 if the
image is missing. Responses are `image/png`; locked images use `Cache-Control: no-store`.

Temporary testing: `?preview=true` skips the lock without saving progress when
`UNSOLVED_TEST_PREVIEW` is enabled (default `1` for this local learning server).
Set it to `0` before publishing.

## Progress endpoints

GET `/api/progress` returns `{ "unlocked": { "05": FileDoc } }`, including only
saved unlocked records. React reads this on login to reconcile its local cache.
POST `/api/progress/reset` saves an empty list and returns `{ "ok": true }`.
Read/write failures return HTTP 503. There is one shared game per server; notes,
attempts, and elapsed time were initially stored in the browser. The notebook
now uses SQLite as described below; attempts and elapsed time remain local.

## Notebook endpoints

GET `/api/notes` returns `{ "text": "saved writing" }` or `{ "text": null }` before
the first save. PUT `/api/notes` accepts `{ "text": "new writing" }` (a string up to
100,000 characters) and returns `{ "ok": true }`. Empty strings clear the writing.
Invalid input returns HTTP 422; database failures return HTTP 503. The frontend
loads when Notes opens and saves with the Save notes button. POST
`/api/progress/reset` also clears the notebook. SQLite data lives in the ignored
`server/private/game.sqlite3` file.
