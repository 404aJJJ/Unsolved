# Connecting the website to the backend

The frontend only ever talks to `/api/*` (contract in [api.md](api.md)). Three ways to run it:

| Mode | Set in repo-root `.env` | Use for |
|---|---|---|
| Dev mock | nothing | Frontend work. Vite serves `/api/*` from `web/vite.config.ts` and `web/dev-api/`, using `server/private/case-private.json` and your `.env` keys. |
| Dev proxy | `API_PROXY_TARGET=http://localhost:8000` | Developing the real FastAPI backend. Vite forwards `/api` to it, the mock is off, no CORS needed. Restart `npm run dev` after changing `.env`. |
| Direct | `VITE_API_URL=https://api.example.com` | A deployed site (Vultr). The backend must send CORS headers for the site's origin. |

`VITE_*` values are public and end up in the browser bundle. API keys (`ELEVEN_LABS_API_KEY`, `GEMINI_API_KEY`) are never prefixed with `VITE_`; only the server reads them.

## What the backend must implement
Everything in [api.md](api.md): `GET /api/config`, `POST /api/unlock`, `POST /api/accuse`, `POST /api/narrate`. The `/api/dev/*` routes are mock-only and must not exist in production. Port the logic from `web/dev-api/accuse.ts` and `web/dev-api/narrate.ts`; they are the reference behaviour (limits, caching, fallbacks, prompt-injection guard).

## How the frontend is wired
- `web/src/api/http.ts`: the one fetch helper (base URL, timeout, `{ error }` handling). New endpoints go through `apiRequest`.
- `web/src/api/client.ts`: unlock, accuse and dev endpoints. `config.ts` and `narration.ts` hold their own calls.
- `web/src/store/api.ts`: loads `/api/config` once; `features.*` flags drive the UI.
- `web/src/store/narrator.ts`: one narrator for the desktop. Server voice when `features.narration` is true, browser voice otherwise or on any failure. Volume and mute are saved.
- `web/src/content/narration.ts`: turns documents, emails and chats into scripts. `web/src/components/NarrateButton.tsx` is the button; it already sits in the case viewer, Mail, Messages, the login screen and the verdict.

## Adding another integration (hints, interrogation, ...)
1. Document the endpoint and any `features` flag in `api.md`.
2. Add the call with `apiRequest` in `client.ts` (or its own file) and the flag to `ApiFeatures` in `api/config.ts`.
3. Gate the UI on `useApi((s) => s.features.<flag>)` and keep a static fallback: the core game must work with every AI feature off.
4. Keep keys and any answer-bearing data server-side. Never put them in `VITE_*` values or the client code.
5. Add a mock in `web/dev-api/` and a button in the Test Lab so the whole team can try it.

## Checklist for the Python lane
- [ ] FastAPI app on `PORT` (see `.env.example`), CORS for the site origin, `.env` loaded
- [ ] `GET /api/config`, `POST /api/unlock`, `POST /api/accuse`, `POST /api/narrate`
- [ ] Unlock state and locked file contents only after a correct unlock
- [ ] Gemini and ElevenLabs keys from the environment, graceful behaviour when missing
- [ ] Test it with `API_PROXY_TARGET` and the Test Lab (status lights, "Test server voice", scenario probes)
