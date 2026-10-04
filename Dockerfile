# One image serves the website and the API on a single origin (no CORS, cookies just work).
# Secrets are NOT baked in: server/private/ and .env are excluded by .dockerignore and supplied at run time.

# --- build the website ---
FROM node:22-alpine AS web
WORKDIR /build/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# --- run the API (and serve the built site) ---
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UNSOLVED_STATIC_DIR=/app/web/dist \
    UNSOLVED_CASE_PATH=/secrets/case-private.json \
    UNSOLVED_DB_PATH=/data/game.sqlite3
WORKDIR /app
COPY server/requirements.txt server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt
COPY server/ server/
COPY --from=web /build/web/dist web/dist
RUN useradd --system --uid 1000 --create-home app && mkdir /data && chown app /data
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8000/api/health',timeout=3)" || exit 1
# --proxy-headers: Caddy sits in front, so the real client IP (rate limits) and https scheme (Secure cookie) come from its headers.
CMD ["python", "-m", "uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
