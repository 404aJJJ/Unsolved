# Unsolved.exe
RowdyHacks '26 project: a detective casefile game for the web, played on a Vista-style desktop.

## Run it locally

You need `server/private/case-private.json` (answers and locked files; gitignored, get it from the team) and optionally a repo-root `.env` (copy `.env.example`) for the Gemini and ElevenLabs keys.

**Quick (frontend only, no Python).** The dev server mimics the whole API in memory.
```bash
cd web
npm install
npm run dev
```
Open the address it prints (http://localhost:5173).

**With the real Python API** (use this to test what ships). Two terminals, both from the repo root:
```bash
bash server/run-dev.sh        # terminal 1: creates server/.venv on first run, API on http://127.0.0.1:8000
```
```bash
cd web && npm install && npm run dev:api     # terminal 2: the site, with /api forwarded to Python
```
On Windows, terminal 1 is: `py -m venv server\.venv`, `server\.venv\Scripts\pip install -r server\requirements.txt`, then `set UNSOLVED_DEV=1` and `server\.venv\Scripts\python -m uvicorn server.main:app --reload --port 8000`.

Python won't start? In dev, the boot screen's `[FAILED]` offers **Continue without the API**, and the Test Lab has a **Mock API (no Python)** toggle; both switch the site to the built-in mock. Other problems: see "Troubleshooting" in [server/README.md](server/README.md).

## Layout
- `web/` – React + Vite + TypeScript frontend (shell, apps, content components, mock API)
- `server/` – Python FastAPI backend (see `server/README.md`); `server/private/` is gitignored
- `docs/` – design docs, roadmap, API contract (start at `docs/README.md`)

## Workflow
Each person works on their own branch (`James`, `Noah`, `Bad-Alex`) and merges to `main` via PR.

## Run the Python API

See [server/README.md](server/README.md) for setup, frontend connection, and a walkthrough of your first endpoint.
