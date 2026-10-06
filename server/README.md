# Your first Python API

React draws the desktop. Python handles requests and reads case records. The JSON
file stores data between server restarts. An API is the interface to that data;
it is not itself a database.

## Run it

In a terminal, from the repository root:

```sh
python3 -m venv server/.venv
server/.venv/bin/python -m pip install -r server/requirements-dev.txt
server/.venv/bin/python -m uvicorn server.main:app --reload --port 8000
```

A virtual environment keeps this project's Python dependencies separate from other
projects. FastAPI defines the endpoints; Uvicorn listens for HTTP requests and runs
the app. `--reload` restarts Python when you save code.

Open http://localhost:8000/api/health. You should see `{"ok":true}`.
Then open http://localhost:8000/docs: FastAPI's interactive endpoint tester.
Expand POST `/api/unlock`, click **Try it out**, enter a file ID and answer, and
click **Execute**. The Diamond report uses API ID `05` even though it is displayed
as file 04. Security uses `04`; Purchase Records uses `06`.

## Connect React

Fastest way: two terminals from the repo root.

```sh
bash server/run-dev.sh          # Python API on http://127.0.0.1:8000
cd web && npm run dev:api       # the site, with every /api request forwarded to Python
```

`npm run dev:api` makes Vite forward `/api/*` to `http://127.0.0.1:8000`, so the site and API share an origin (no CORS, and the per-player cookie just works) and the built-in mock is switched off. Plain `npm run dev` still uses the mock and needs no Python.

To forward somewhere else, put `API_PROXY_TARGET=http://host:port` in the repo-root `.env` and restart `npm run dev`. `VITE_API_URL` (a separate API origin) is only for special cases; the dev server reads `.env` files from the **repo root**, not `web/` (an old `web/.env.local` is ignored).

`run-dev.sh` starts Python with `UNSOLVED_DEV=1` (and `UNSOLVED_ALLOW_SAMPLE=1` when the private file is missing) so the Test Lab works against it (never set that on a public server). The `?preview=true` image bypass needs `UNSOLVED_TEST_PREVIEW=1` and is off by default.

Keys: the server reads `ELEVEN_LABS_API_KEY` from the repo-root `.env` (real environment variables win).

## Troubleshooting
| What you see | Cause and fix |
|---|---|
| Boot screen says `[FAILED] Connecting to the investigation server` | Python isn't running (or not on port 8000). Start `bash server/run-dev.sh`, then press Enter on the boot screen. Check http://127.0.0.1:8000/api/health. |
| Log-on says "Cannot load your progress" | The API answered with an error: usually the case file is missing. Check `server/private/case-private.json` exists. |
| Locks, report or Notes fail with 503 | `server/private/case-private.json` is missing or invalid JSON (and the sample fallback isn't on). Use `run-dev.sh` (it falls back to the sample case), or get the real file. |
| You want to test with no secrets at all | Dev only: leave `case-private.json` out. The mock (`npm run dev`) and `run-dev.sh` then use `server/sample/case-sample.json`: a fake case with fake answers (04=`0000`, 05=`SAMPLE`, 06=`1111`, culprit `bm`). The Test Lab shows "SAMPLE case data" and lists the answers. |
| `ModuleNotFoundError: server` | Start uvicorn from the **repo root** (`python -m uvicorn server.main:app`), not from `server/`. |
| `ModuleNotFoundError: fastapi` | The venv isn't being used or deps aren't installed: `server/.venv/bin/python -m pip install -r server/requirements.txt`. |
| Python won't start but you still want to work | Dev only: on the boot screen's `[FAILED]` press **Continue without the API**, or toggle **Mock API (no Python)** in the Test Lab. Every request then goes to the built-in in-memory mock (`/mock-api`) and the page reloads; toggle it off the same way. The switch is saved in localStorage and does not exist in production builds. |
| Site works but the Python API is never hit | You ran `npm run dev` (mock). Use `npm run dev:api`. A changed `.env` needs a Vite restart. |
| Port 8000 or 5173 already in use | Stop the other process (`lsof -i :8000`). If you moved the API, set `API_PROXY_TARGET` in `.env`. |
| Progress seems shared or lost between runs | Each browser has its own game via a cookie; clearing cookies starts a new one. Data lives in `server/private/game.sqlite3` (delete it to reset everything). |
| Test Lab buttons say dev routes missing | The API wasn't started with `UNSOLVED_DEV=1` (use `run-dev.sh`). |

## What each endpoint does
`/api/health`, `/api/config` (feature flags), `/api/unlock`, `/api/progress` (+ `/reset`), `/api/notes`,
`/api/files/{id}/image`, `/api/accuse` (final report in `server/accuse.py`) and `/api/narrate`
(ElevenLabs, `server/narrate.py`). Each browser gets a random `uid` cookie and its own progress and notebook.
The full contract is `docs/api.md`.

## Follow one request through the code

1. `web/src/api/client.ts` sends JSON: `fileId`, `answer`, and `attempt`.
2. `UnlockRequest` in `server/main.py` checks those fields and their types.
3. `@app.post("/api/unlock")` routes that request to the `unlock` function.
4. Python reads `server/private/case-private.json` and compares the answer.
5. Python returns a dictionary; FastAPI sends it as JSON back to React.
6. React uses `ok` to open the viewer or show an error.

GET asks for information. POST submits data to process. An endpoint is one URL
and method, such as POST `/api/unlock`. A request is what the browser sends;
a response is what Python sends back.

The private JSON has `answers`, `files`, and optional `hints` dictionaries keyed by
API file ID. It is gitignored: teammates need their own copy. This starter reuses
your existing local file. `UNSOLVED_CASE_PATH` can point at a different file.

## Check your work

```sh
server/.venv/bin/python -m unittest discover -s server/tests -v
```

The tests use fake records to check correct and incorrect answers, malformed
requests, unavailable data, and browser access from the frontend's local address.

## Images and saved unlock progress

All five WebP images are in `server/assets/` and served by Python (files 01 and 02 are also copied to `web/public/evidence/` so a static host can serve them):

| Display number | API URL | Access |
| --- | --- | --- |
| 01 | `/api/files/01/image` | Public |
| 02 | `/api/files/02/image` | Public |
| 03 | `/api/files/04/image` | Requires Security Logs unlock |
| 04 | `/api/files/05/image` | Requires Diamond report unlock |
| 05 | `/api/files/06/image` | Requires Purchase Records unlock |

A correct answer writes the internal file ID to `server/private/progress.json`.
Python reads that file when an image is requested. This survives Python restarts.
The file is local and gitignored; it represents one game shared by everyone using
this server. It is not a per-player account system.

On login React calls GET `/api/progress` and replaces its cached unlock list with
Python's saved list. Old browser-only unlocks may therefore need unlocking once
again. Notes, elapsed time, and attempts remain in browser localStorage.

Restart case calls POST `/api/progress/reset` first, then clears browser progress
and closes windows. If Python cannot reset, browser progress is kept and an error
is shown. Locked image responses use `Cache-Control: no-store`.

The temporary test button adds `?preview=true` to an image URL. Previewing never
unlocks a record. The learning server enables previews by default. Disable this
shortcut with `UNSOLVED_TEST_PREVIEW=0` before publishing:

```sh
UNSOLVED_TEST_PREVIEW=0 server/.venv/bin/python -m uvicorn server.main:app --reload --port 8000
```

No SQL database is needed for these five files. The JSON progress file is a small
local learning implementation intended for one server process.

## Notebook database example

The notebook now uses Python's built-in SQLite support. GET `/api/notes` loads
the saved text; PUT `/api/notes` accepts `{ "text": "your writing" }` and saves it.
The database is created at `server/private/game.sqlite3` on first use. It is local
and gitignored. No additional Python dependencies are needed.

Open Notes and click **Save notes** after editing. Wait for **Saved**, then refresh
and reopen Notes to see the database load. This example uses an explicit save
button instead of automatic saves. Restart case clears the database notebook.

See `docs/notebook-walkthrough.md` for a step-by-step explanation of the Python,
SQL, and frontend request. Timer and suspect notes remain in browser storage.
