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

Put this in the repo-root `.env` (next to `.env.example`):

```env
API_PROXY_TARGET=http://localhost:8000
```

Restart `npm run dev` from `web/`. Vite now forwards every `/api/*` request to Python, so the site and API share an
origin (no CORS, and the per-player cookie just works) and the built-in mock is switched off. Keep both servers running.
`VITE_API_URL=http://localhost:8000` also works for local development, but a separate API origin only suits `localhost`;
for anything deployed keep one origin (see `docs/deploy-vultr.md`).

To use the Test Lab against Python, start it with `UNSOLVED_DEV=1` (never on a public server). The `?preview=true`
image bypass needs `UNSOLVED_TEST_PREVIEW=1` and is off by default.

Keys: the server reads `GEMINI_API_KEY` and `ELEVEN_LABS_API_KEY` from the repo-root `.env` (real environment variables win).

## What each endpoint does
`/api/health`, `/api/config` (feature flags), `/api/unlock`, `/api/progress` (+ `/reset`), `/api/notes`,
`/api/files/{id}/image`, `/api/accuse` (final report, Gemini grading in `server/accuse.py`) and `/api/narrate`
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
