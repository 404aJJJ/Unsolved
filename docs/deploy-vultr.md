# Deploying to Vultr

One small Vultr Cloud Compute server runs everything: Caddy (HTTPS, port 80/443) in front of one container that serves the website and the Python API on the same origin. Players' progress and notebooks live in a SQLite volume, one game per browser.

## What you need
- A Vultr account (you create it; billing is yours).
- The two secret files that are **never in git**:
  - `.env` with `GEMINI_API_KEY` and `ELEVEN_LABS_API_KEY` (start from `.env.example`). Both are optional: without them grading and narration degrade gracefully.
  - `server/private/case-private.json` (answers, locked files, solution, rubric).
- Optional: a domain (GoDaddy track). Without one the game runs on `http://<server-ip>`.

## Steps (about 10 minutes)
1. **Create the server.** Vultr dashboard → *Deploy* → *Cloud Compute* (Regular Performance) → Ubuntu 24.04 → at least 2 GB RAM (the website build needs it; the script adds swap on smaller plans) → add your SSH key → deploy. Note the IP.
2. **Get the code onto it** (the branch must be pushed first):
   ```sh
   ssh root@<server-ip>
   git clone https://github.com/404aJJJ/Unsolved.git && cd Unsolved
   ```
3. **Copy the secrets up** (run these on your own machine, from the repo root):
   ```sh
   scp .env root@<server-ip>:~/Unsolved/.env
   ssh root@<server-ip> mkdir -p ~/Unsolved/server/private
   scp server/private/case-private.json root@<server-ip>:~/Unsolved/server/private/
   ```
4. **Start it** (on the server):
   ```sh
   sudo bash deploy/setup-vultr.sh                    # plain http on the server's IP
   sudo bash deploy/setup-vultr.sh unsolved.example.com   # or: automatic HTTPS for your domain
   ```
   It installs Docker, opens ports 80/443, builds the image and starts the stack, then waits for `/api/health`.
5. **Domain (optional).** At GoDaddy add an **A record** for the name pointing at the server IP *before* step 4 (Caddy fetches the certificate on first start). `www` can be a CNAME to the same name.
6. **Check it.**
   ```sh
   curl -s http://127.0.0.1/api/config     # {"features":{"narration":true,"gradingAI":true}} when both keys are set
   docker compose -f deploy/docker-compose.yml logs --tail=50
   ```
   Open the site, log on, play. Narration and grading flags show `false` if a key is missing or still the `insert_...` placeholder.

## Website on Vercel, API on Vultr
The site can live on Vercel while only the API runs on Vultr. Vercel must **forward `/api/*` to the API** so the browser only ever talks to one origin; otherwise the per-player cookie is treated as a third-party cookie and blocked.
1. Give the API an HTTPS name. No domain needed: for IP `45.76.235.124` use `45-76-235-124.sslip.io` and run `sudo bash deploy/setup-vultr.sh 45-76-235-124.sslip.io` on the server (Caddy gets the certificate).
2. `web/vercel.json` already forwards `/api/*` to that name and falls back to `index.html` for every other path. If the API address changes, edit the `destination` there (Vercel cannot read environment variables in this file).
3. Vercel: *Add New Project* → import the GitHub repo → **Root Directory `web`** → framework Vite (build `npm run build`, output `dist`) → Deploy. Leave `VITE_API_URL` unset.
4. Test on the Vercel URL: log on, open a locked file's image, file a report. Progress must survive a page reload.

## Updating
```sh
cd ~/Unsolved && git pull && sudo bash deploy/setup-vultr.sh
```
The script remembers your domain in `deploy/.env`, so updating keeps HTTPS. (Running `docker compose up` by hand also works once `deploy/.env` exists; without it, compose falls back to plain http on port 80 and the HTTPS name stops answering. If that happens, run `sudo bash deploy/setup-vultr.sh <your-domain>` again.)
Player data survives (it is in the `unsolved-data` volume). `docker compose -f deploy/docker-compose.yml down -v` deletes it.

## Production safety (already the defaults)
- `UNSOLVED_DEV=0`: the Test Lab routes (`/api/dev/*`) do not exist.
- `UNSOLVED_TEST_PREVIEW=0`: `?preview=true` cannot open locked evidence images.
- `server/private/` and `.env` are excluded from the image (`.dockerignore`) and the case file is mounted read-only.
- Rate limits: 12 reports and 20 narrations per minute per client.
- Never set `UNSOLVED_DEV=1` or `UNSOLVED_TEST_PREVIEW=1` on the public server.

## Without Docker
```sh
python3 -m venv server/.venv && server/.venv/bin/pip install -r server/requirements.txt
(cd web && npm ci && npm run build)
UNSOLVED_DB_PATH=/var/lib/unsolved/game.sqlite3 server/.venv/bin/python -m uvicorn server.main:app --host 127.0.0.1 --port 8000 --proxy-headers
```
Put Caddy or nginx in front for HTTPS. The API serves `web/dist` itself.

## Configuration reference (environment variables)
| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY`, `GEMINI_MODEL` | - / `gemini-3.5-flash-lite` | Theory grading |
| `ELEVEN_LABS_API_KEY`, `ELEVEN_LABS_VOICE_ID`, `ELEVEN_LABS_MODEL` | - / `JBFqnCBsd6RMkjVDRZzb` / `eleven_multilingual_v2` | Narration |
| `UNSOLVED_CASE_PATH` | `server/private/case-private.json` | Case data (`/secrets/case-private.json` in Docker) |
| `UNSOLVED_DB_PATH` | `server/private/game.sqlite3` | Player data (`/data/game.sqlite3` in Docker) |
| `UNSOLVED_STATIC_DIR` | `web/dist` | Built website to serve |
| `UNSOLVED_ALLOWED_ORIGINS` | localhost dev origins | Only if the site is served from a different origin |
| `UNSOLVED_DEV`, `UNSOLVED_TEST_PREVIEW` | `0`, `0` | Developer shortcuts; keep off in production |
