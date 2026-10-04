"""Unsolved.exe API. Run from the repository root: uvicorn server.main:app --port 8000

Endpoints: health, config, unlock, progress, notes, evidence images, accuse (Gemini grading) and narrate (ElevenLabs).
Every player gets their own game: a random `uid` cookie keys their unlocked files and notebook in SQLite.
In production one process also serves the built website (web/dist), so the site and API share an origin.
"""
import json
import os
import re
import secrets
import sqlite3
from contextlib import closing
from pathlib import Path
from threading import RLock

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import accuse as accuse_logic
from . import narrate as narrate_logic
from .envfile import configured, load_env_files

REPO_ROOT = Path(__file__).resolve().parent.parent
# The repo-root .env supplies keys for local runs. Real environment variables (Docker, systemd) take priority.
load_env_files(REPO_ROOT / ".env", Path(__file__).parent / ".env")

app = FastAPI(title="Unsolved.exe API")

# Same-origin deployments (site and API on one host) need no CORS. For a separate frontend origin, list it in
# UNSOLVED_ALLOWED_ORIGINS (comma separated). Cookies only travel cross-origin when the origin is listed.
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get(
    "UNSOLVED_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5181",
).split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Content-Type"],
)

CASE_PATH = Path(os.environ.get(
    "UNSOLVED_CASE_PATH", str(Path(__file__).parent / "private" / "case-private.json")
))
DATABASE_PATH = Path(os.environ.get("UNSOLVED_DB_PATH", str(Path(__file__).parent / "private" / "game.sqlite3")))
STATIC_DIR = Path(os.environ.get("UNSOLVED_STATIC_DIR", str(REPO_ROOT / "web" / "dist")))
DB_LOCK = RLock()
LOCKED_IDS = {"04", "05", "06"}
# Developer shortcuts (Test Lab routes and the ?preview=true image bypass). Both are OFF unless explicitly enabled;
# never set them on the public server.
DEV = os.environ.get("UNSOLVED_DEV", "0") == "1"
ALLOW_TEST_PREVIEW = os.environ.get("UNSOLVED_TEST_PREVIEW", "0") == "1"
UID_PATTERN = re.compile(r"^[a-f0-9]{32}$")
COOKIE_MAX_AGE = 60 * 60 * 24 * 30

IMAGES = {
    "01": "incidentReport_01.webp",
    "02": "interviewStatements_02.webp",
    "04": "securityLogs_03.webp",
    "05": "diamondExamReport_04.webp",
    "06": "purchaseRecords_05.webp",
}


@app.middleware("http")
async def player_session(request: Request, call_next):
    """Give every browser its own game via an opaque cookie. Nothing personal is stored."""
    uid = request.cookies.get("uid", "")
    fresh = not UID_PATTERN.match(uid)
    if fresh:
        uid = secrets.token_hex(16)
    request.state.uid = uid
    response = await call_next(request)
    if fresh:
        secure = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
        response.set_cookie("uid", uid, max_age=COOKIE_MAX_AGE, httponly=True, samesite="lax", secure=secure, path="/")
    return response


def uid_of(request: Request) -> str:
    return request.state.uid


def client_key(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def open_database():
    """SQLite creates this database file if it doesn't exist yet."""
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.execute("CREATE TABLE IF NOT EXISTS notes (uid TEXT PRIMARY KEY, text TEXT NOT NULL)")
    connection.execute(
        "CREATE TABLE IF NOT EXISTS progress (uid TEXT NOT NULL, file_id TEXT NOT NULL, PRIMARY KEY (uid, file_id))"
    )
    connection.commit()
    return connection


def read_unlocked_files(uid):
    try:
        with DB_LOCK, closing(open_database()) as connection:
            rows = connection.execute("SELECT file_id FROM progress WHERE uid = ?", (uid,)).fetchall()
        return {row[0] for row in rows if row[0] in LOCKED_IDS}
    except (OSError, sqlite3.Error):
        raise HTTPException(status_code=503, detail="Saved progress could not be read.")


def add_unlocked_files(uid, ids):
    try:
        with DB_LOCK, closing(open_database()) as connection, connection:
            connection.executemany("INSERT OR IGNORE INTO progress (uid, file_id) VALUES (?, ?)", [(uid, i) for i in ids])
    except (OSError, sqlite3.Error):
        raise HTTPException(status_code=503, detail="Progress could not be saved.")


def remove_unlocked_file(uid, file_id):
    try:
        with DB_LOCK, closing(open_database()) as connection, connection:
            connection.execute("DELETE FROM progress WHERE uid = ? AND file_id = ?", (uid, file_id))
    except (OSError, sqlite3.Error):
        raise HTTPException(status_code=503, detail="Progress could not be saved.")


def load_case():
    try:
        return json.loads(CASE_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


# ---------- health and config ----------

@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/config")
def config():
    """What this server can do. The site hides or degrades features whose flag is false."""
    return {"features": {"narration": narrate_logic.configured(), "gradingAI": configured("GEMINI_API_KEY")}}


# ---------- notebook ----------

class NotesRequest(BaseModel):
    text: str = Field(max_length=100000)


@app.get("/api/notes")
def get_notes(request: Request):
    try:
        with DB_LOCK, closing(open_database()) as connection:
            row = connection.execute("SELECT text FROM notes WHERE uid = ?", (uid_of(request),)).fetchone()
        # None means nothing has been saved yet, so old browser notes can be kept.
        return JSONResponse({"text": row[0] if row is not None else None}, headers={"Cache-Control": "no-store"})
    except (OSError, sqlite3.Error):
        raise HTTPException(status_code=503, detail="Notebook could not be loaded.")


def save_notes(uid, text):
    with DB_LOCK, closing(open_database()) as connection, connection:
        connection.execute(
            "INSERT INTO notes (uid, text) VALUES (?, ?) ON CONFLICT(uid) DO UPDATE SET text = excluded.text",
            (uid, text),
        )


@app.put("/api/notes")
def update_notes(body: NotesRequest, request: Request):
    try:
        save_notes(uid_of(request), body.text)
        return {"ok": True}
    except (OSError, sqlite3.Error):
        raise HTTPException(status_code=503, detail="Notebook could not be saved.")


# ---------- progress ----------

@app.get("/api/progress")
def progress(request: Request):
    ids = read_unlocked_files(uid_of(request))
    case = load_case()
    try:
        files = case["files"]
        return JSONResponse({"unlocked": {i: files[i] for i in ids}}, headers={"Cache-Control": "no-store"})
    except (TypeError, KeyError):
        raise HTTPException(status_code=503, detail="Case data missing or invalid.")


@app.post("/api/progress/reset")
def reset_progress(request: Request):
    uid = uid_of(request)
    try:
        with DB_LOCK, closing(open_database()) as connection, connection:
            connection.execute("DELETE FROM progress WHERE uid = ?", (uid,))
            connection.execute("INSERT INTO notes (uid, text) VALUES (?, '') ON CONFLICT(uid) DO UPDATE SET text = ''", (uid,))
    except (OSError, sqlite3.Error):
        raise HTTPException(status_code=503, detail="Progress could not be reset.")
    return {"ok": True}


# ---------- unlock ----------

class UnlockRequest(BaseModel):
    """FastAPI checks incoming JSON against these fields before calling unlock."""
    fileId: str = Field(min_length=1, max_length=8)
    answer: str = Field(max_length=128)
    attempt: int = Field(default=1, ge=1, le=10000)


@app.post("/api/unlock")
def unlock(body: UnlockRequest, request: Request):
    # Load server-only data. Never return the answer table to the browser.
    try:
        data = json.loads(CASE_PATH.read_text(encoding="utf-8"))
        answers, files, hints = data["answers"], data["files"], data.get("hints", {})
        if not all(isinstance(value, dict) for value in (answers, files, hints)):
            raise ValueError("Invalid case data")
        if any(not isinstance(answer, str) for answer in answers.values()):
            raise ValueError("Invalid answers")
        if any(not isinstance(files.get(key), dict) for key in answers):
            raise ValueError("Missing file data")
        if any(not isinstance(ladder, list) or not all(isinstance(hint, str) for hint in ladder)
               for ladder in hints.values()):
            raise ValueError("Invalid hints")
    except (OSError, ValueError, KeyError, TypeError):
        return JSONResponse(status_code=503, content={"error": "Case data missing or invalid."})

    expected = answers.get(body.fileId)
    if expected is None:
        return JSONResponse(status_code=404, content={"error": "unknown file"})

    # These are puzzle passwords, so whitespace and letter case should not matter.
    if body.answer.strip().upper() == expected.strip().upper():
        add_unlocked_files(uid_of(request), [body.fileId])
        return {"ok": True, "file": files[body.fileId]}

    ladder = hints.get(body.fileId, [])
    return {"ok": False, "hints": ladder[:body.attempt]}


# ---------- evidence images ----------

@app.get("/api/files/{file_id}/image")
def evidence_image(file_id: str, request: Request, preview: bool = False):
    filename = IMAGES.get(file_id)
    if filename is None:
        return JSONResponse(status_code=404, content={"error": "Image not found."})
    # Files 01 and 02 are public. A test preview (dev only) doesn't unlock the record or change progress.
    if file_id in LOCKED_IDS and not (preview and ALLOW_TEST_PREVIEW) and file_id not in read_unlocked_files(uid_of(request)):
        return JSONResponse(status_code=403, content={"error": "File is locked."})
    image_path = Path(__file__).parent / "assets" / filename
    if not image_path.is_file():
        return JSONResponse(status_code=404, content={"error": "Image not found."})
    headers = {"Cache-Control": "no-store"} if file_id in LOCKED_IDS else {"Cache-Control": "public, max-age=3600"}
    return FileResponse(image_path, media_type="image/webp", headers=headers)


# ---------- final report (Gemini) ----------

class AccuseRequest(BaseModel):
    culprit: str = Field(default="", max_length=8)
    evidence: list[str] = Field(default_factory=list, max_length=8)
    theory: str = Field(default="", max_length=accuse_logic.MAX_THEORY * 2)
    timedOut: bool = False


@app.post("/api/accuse")
async def accuse(body: AccuseRequest, request: Request):
    if accuse_logic.rate_limited(client_key(request)):
        return JSONResponse(status_code=429, content={"error": "Too many reports. Wait a minute and try again."})
    if not body.culprit and not body.timedOut:
        return JSONResponse(status_code=400, content={"error": "Name a suspect first."})
    case = load_case()
    solution = case.get("solution") if case else None
    if not solution:
        return JSONResponse(status_code=503, content={"error": "Case data missing or invalid."})
    return await accuse_logic.handle_accuse(
        body.culprit, body.evidence, body.theory, body.timedOut, solution, getattr(app.state, "http_transport", None)
    )


# ---------- narration (ElevenLabs) ----------

class NarrateRequest(BaseModel):
    text: str = Field(default="", max_length=narrate_logic.MAX_CHARS * 4)


@app.post("/api/narrate")
async def narrate(body: NarrateRequest, request: Request):
    status, audio, error = await narrate_logic.narrate(body.text, client_key(request), getattr(app.state, "http_transport", None))
    if audio is not None:
        return Response(content=audio, media_type="audio/mpeg")
    return JSONResponse(status_code=status, content={"error": error})


# ---------- developer routes (Test Lab); only when UNSOLVED_DEV=1 ----------

if DEV:
    @app.get("/api/dev/status")
    def dev_status():
        case = load_case()
        return {
            "privateData": case is not None,
            "solution": bool(case and case.get("solution")),
            "gemini": configured("GEMINI_API_KEY"),
            "model": os.environ.get("GEMINI_MODEL") or "gemini-3.5-flash-lite",
            "elevenLabs": narrate_logic.configured(),
            "voice": narrate_logic.voice_id(),
        }

    @app.get("/api/dev/files")
    def dev_files(request: Request):
        case = load_case()
        if not case:
            raise HTTPException(status_code=503, detail="case-private.json missing")
        add_unlocked_files(uid_of(request), sorted(LOCKED_IDS))  # so the evidence images are served too
        return {"files": case["files"]}

    @app.get("/api/dev/scenarios")
    def dev_scenarios():
        case = load_case()
        if not case:
            raise HTTPException(status_code=503, detail="case-private.json missing")
        return {"scenarios": case.get("devScenarios", [])}

    class RelockRequest(BaseModel):
        id: str = Field(max_length=8)

    @app.post("/api/dev/relock")
    def dev_relock(body: RelockRequest, request: Request):
        remove_unlocked_file(uid_of(request), body.id)
        return {"ok": True}


# ---------- the website (production: one origin for site and API) ----------

if (STATIC_DIR / "index.html").is_file():
    if (STATIC_DIR / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="site-assets")

    @app.get("/{path:path}", include_in_schema=False)
    def website(path: str):
        if path.startswith("api/"):
            return JSONResponse(status_code=404, content={"error": "unknown endpoint"})
        candidate = (STATIC_DIR / path).resolve()
        if path and candidate.is_file() and STATIC_DIR.resolve() in candidate.parents:
            # The slim Docker image has no system mime table, so name the types we ship explicitly.
            known = {".webp": "image/webp", ".svg": "image/svg+xml", ".js": "text/javascript", ".css": "text/css"}
            headers = {"Cache-Control": "public, max-age=86400"} if path.startswith("evidence/") else None
            return FileResponse(candidate, media_type=known.get(candidate.suffix), headers=headers)
        return FileResponse(STATIC_DIR / "index.html", headers={"Cache-Control": "no-cache"})
