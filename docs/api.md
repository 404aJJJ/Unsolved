# API contract (v0)

The frontend talks to this API only. During development the Vite dev server serves a mock of it (`web/vite.config.ts`) backed by the gitignored `server/private/case-private.json`. The FastAPI backend must implement the same shapes; point the client at it with `VITE_API_URL`.

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

Rules: trim whitespace, compare case-insensitively, numeric answers are four-digit strings. Locked file content is only ever returned from a correct unlock.

## Planned
- `POST /api/accuse`: culprit, evidence per claim (opportunity, false alibi, matching replica), free-text theory; returns verdict, per-claim feedback and the reasoning-chain explanation. Gemini grading with a dropdown/exact-match fallback.
- Optional: `GET /api/session` if unlocked state moves server-side.
