# Unsolved.exe
RowdyHacks '26 project: a detective casefile game for the web, played on a Vista-style desktop.

## Run the frontend
```bash
cd web
npm install
npm run dev
```
Open http://localhost:5173.

Unlocking files 04-06 needs `server/private/case-private.json`. It holds the answers and locked content, so it is gitignored; get it from the team. Without it, locks show "server data missing".

## Layout
- `web/` – React + Vite + TypeScript frontend (shell, apps, content components, mock API)
- `server/` – Python FastAPI backend (see `server/README.md`); `server/private/` is gitignored
- `docs/` – design docs, roadmap, API contract (start at `docs/README.md`)

## Workflow
Each person works on their own branch (`James`, `Noah`, `Bad-Alex`) and merges to `main` via PR.

## Run the Python API

See [server/README.md](server/README.md) for setup, frontend connection, and a walkthrough of your first endpoint.
