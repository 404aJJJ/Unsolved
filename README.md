# Unsolved
RowdyHacks '26 project: a detective casefile game for the web.

## Run
No build step. Serve the repo root with any static server:

```bash
python3 -m http.server 8000
```
then open http://localhost:8000.

## Layout
- `index.html` – entry page
- `src/engine/` – game logic (case loading, clue/deduction state)
- `src/ui/` – rendering
- `src/styles/` – CSS
- `data/cases/<id>/case.json` – case content
- `public/assets/` – images, audio
- `docs/` – shared documentation

## Workflow
Each person works on their own branch (`James`, `Noah`, `Bad-Alex`) and merges to `main` via PR.
