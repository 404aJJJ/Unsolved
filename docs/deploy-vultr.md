# Deploying

Host both the website and the API on the free tiers. Do not add a card, and do not upgrade either plan: when the free quota runs out they pause, they do not bill you.

| Piece | Plan | If you outgrow it |
|---|---|---|
| Site + API | [Vercel Hobby](https://vercel.com/pricing) ($0, personal non-commercial) | Project pauses until the next month. Do not switch on Pro. |
| Player saves | [Neon Free](https://neon.com/pricing) ($0, no card) | Compute suspends until next month. Do not upgrade to Launch or Scale. |
| Voices | Leave the key unset | The game still runs with the browser voice. ElevenLabs is a separate account and can bill on its own if that key stays set. |

Vultr is the hackathon server. Destroy it after the Vercel URL works. That is what stops the Vultr bill. A GoDaddy domain, if one was registered (`unsolved.work`), renews on its own schedule: turn off auto-renew in GoDaddy or let it expire. Pointing it at Vercel is optional and not required for the game.

## Both on Vercel

One Vercel project, repository root (not `web`). `vercel.json` builds two services and keeps them on one origin, so the player cookie stays first-party:

- `web` — the Vite site
- `api` — this same FastAPI app (`server/main.py`), as one Python function

Vercel has no disk. Player progress and notebooks go to Neon Postgres. The case file is not in git, so its contents go in an environment variable.

### One-time setup
1. **Neon.** Sign up at [neon.tech](https://neon.tech) on the Free plan (no card). Create one project and copy the **pooled** connection string (`…-pooler…`). Do this on neon.tech, not from the Vercel Marketplace: the Marketplace install bills through Vercel. Stay on Free. Hitting the monthly limit suspends the database until next month.
2. **Vercel project.** Use the Hobby plan. Import the GitHub repo. Set **Root Directory** to the repository root (`.` or blank). If this project was created earlier with Root Directory `web`, change it only after the variables in the next step are saved — that old setting publishes the site alone and proxies `/api` to Vultr.
3. **Environment variables** (Production, and Preview if you want branch deploys to play for real):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the pooled Neon connection string |
   | `UNSOLVED_CASE_JSON` | the entire `server/private/case-private.json` file |
   | `ELEVEN_LABS_API_KEY` | same key as `.env` (optional; narration falls back without it) |

   Leave `VITE_API_URL` unset. Do not set `UNSOLVED_DEV` or `UNSOLVED_TEST_PREVIEW`.
4. **Deploy.** Push `main`, or from the repo root: `vercel --prod`.
5. **Check.** `bash deploy/smoke-test.sh https://<your-app>.vercel.app` then log on, unlock a file, reload, and confirm the file stays open.
6. **Destroy the Vultr server.** Customer portal → Products → that Cloud Compute instance (the one at `45.76.235.124`) → Settings (or the server menu) → Destroy. Also delete any snapshot, reserved IP, or extra volume on the same account; those bill on their own. Destroying stops new charges. Usage already accrued on the current invoice can still be due.

Local `bash server/run-dev.sh` keeps using the SQLite file. Neon is used only when `DATABASE_URL` is a `postgres://` or `postgresql://` string.

### What does not carry over
- Games already saved on the Vultr disk stay there. Vercel starts with an empty Neon database.
- Rate limits (12 reports and 20 narrations per minute) are counted inside one running function, so a burst can land on more than one instance.
- `/api/narrate` and `/api/accuse` need the function's 60 second limit, which `vercel.json` sets. Audio and evidence images stay well under the 4.5 MB response cap.

## Vultr (shut this off; do not create another)

One small Vultr Cloud Compute server runs everything today: Caddy (HTTPS, port 80/443) in front of one container that serves the website and the Python API on the same origin. Players' progress and notebooks live in a SQLite volume, one game per browser. Those saves are not copied to Neon. The steps below are only a record of how that box was built.

## What you need
- A Vultr account (you create it; billing is yours).
- The two secret files that are **never in git**:
  - `.env` with `ELEVEN_LABS_API_KEY` (start from `.env.example`). Optional: without it, narration uses the browser voice.
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
   curl -s http://127.0.0.1/api/config     # {"features":{"narration":true}} when the ElevenLabs key is set
   docker compose -f deploy/docker-compose.yml logs --tail=50
   ```
   Open the site, log on, play. Narration shows `false` if the key is missing or still the `insert_...` placeholder.

## Old split: website on Vercel, API on Vultr
This is what the existing Vercel project still does, as long as its Root Directory stays `web`. `web/vercel.json` forwards `/api/*` to `https://45-76-235-124.sslip.io`. Leave that project alone until the new one (root directory = the repo) is serving both. Changing the root directory is the cutover: after that, the root `vercel.json` sends `/api` to the FastAPI service and this proxy is unused. The Vultr box can be shut off once a reload on the Vercel URL still has the player's unlocks.

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
| `ELEVEN_LABS_API_KEY`, `ELEVEN_LABS_MODEL` | - / `eleven_multilingual_v2` | Character voices (the voice IDs are in `server/voices.json`) |
| `UNSOLVED_CASE_PATH` | `server/private/case-private.json` | Case data (`/secrets/case-private.json` in Docker) |
| `UNSOLVED_DB_PATH` | `server/private/game.sqlite3` | Player data (`/data/game.sqlite3` in Docker). Ignored when `DATABASE_URL` is Postgres |
| `DATABASE_URL` | unset | Vercel: Neon pooled connection string. Leave unset locally |
| `UNSOLVED_CASE_JSON` | unset | Vercel: full case file, because `server/private/` is not deployed |
| `UNSOLVED_STATIC_DIR` | `web/dist` | Built website to serve |
| `UNSOLVED_ALLOWED_ORIGINS` | localhost dev origins | Only if the site is served from a different origin |
| `UNSOLVED_DEV`, `UNSOLVED_TEST_PREVIEW` | `0`, `0` | Developer shortcuts; keep off in production |
