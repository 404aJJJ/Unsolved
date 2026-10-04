"""First Python API for Unsolved.exe. Run from the repository root."""
import json
import os
import sqlite3
from contextlib import closing
from pathlib import Path
from threading import RLock

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

# An app collects endpoints: URLs paired with Python functions.
app = FastAPI(title="Unsolved.exe API")

# The frontend and Python run on different ports. Allow the local frontend to call us.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Content-Type"],
)

CASE_PATH = Path(os.environ.get(
    "UNSOLVED_CASE_PATH", str(Path(__file__).parent / "private" / "case-private.json")
))
PROGRESS_PATH = Path(__file__).parent / "private" / "progress.json"
DATABASE_PATH = Path(__file__).parent / "private" / "game.sqlite3"
PROGRESS_LOCK = RLock()
LOCKED_IDS = {"04", "05", "06"}
# Temporary local testing shortcut. Turn this off before publishing the game.
ALLOW_TEST_PREVIEW = os.environ.get("UNSOLVED_TEST_PREVIEW", "1") == "1"


def open_database():
    """SQLite creates this database file if it doesn't exist yet."""
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.execute("""
        CREATE TABLE IF NOT EXISTS notebook (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            text TEXT NOT NULL
        )
    """)
    connection.commit()
    return connection


class NotesRequest(BaseModel):
    text: str = Field(max_length=100000)


@app.get("/api/notes")
def get_notes():
    try:
        with closing(open_database()) as connection:
            row = connection.execute("SELECT text FROM notebook WHERE id = 1").fetchone()
        # None means nothing has been saved yet, so old browser notes can be kept.
        return {"text": row[0] if row is not None else None}
    except (OSError, sqlite3.Error):
        raise HTTPException(status_code=503, detail="Notebook could not be loaded.")


def save_notes(text):
    with closing(open_database()) as connection:
        # The connection context commits on success and rolls back on an error.
        with connection:
            connection.execute("""
                INSERT INTO notebook (id, text) VALUES (1, ?)
                ON CONFLICT(id) DO UPDATE SET text = excluded.text
            """, (text,))


@app.put("/api/notes")
def update_notes(request: NotesRequest):
    try:
        save_notes(request.text)
        return {"ok": True}
    except (OSError, sqlite3.Error):
        raise HTTPException(status_code=503, detail="Notebook could not be saved.")


def read_unlocked_files():
    """Read saved progress each time, so restarting Python doesn't lose it."""
    try:
        saved = json.loads(PROGRESS_PATH.read_text(encoding="utf-8"))
        ids = saved["unlocked_files"]
        if not isinstance(ids, list) or any(id not in LOCKED_IDS for id in ids):
            raise ValueError("Invalid progress")
        return set(ids)
    except FileNotFoundError:
        return set()
    except (OSError, ValueError, KeyError, TypeError):
        raise HTTPException(status_code=503, detail="Saved progress could not be read.")


def save_unlocked_files(ids):
    """Write a new file, then replace the old one to avoid half-written JSON."""
    try:
        PROGRESS_PATH.parent.mkdir(parents=True, exist_ok=True)
        temporary = PROGRESS_PATH.with_suffix(".tmp")
        temporary.write_text(json.dumps({"unlocked_files": sorted(ids)}), encoding="utf-8")
        temporary.replace(PROGRESS_PATH)
    except OSError:
        raise HTTPException(status_code=503, detail="Progress could not be saved.")


@app.get("/api/progress")
def progress():
    with PROGRESS_LOCK:
        ids = read_unlocked_files()
    try:
        files = json.loads(CASE_PATH.read_text(encoding="utf-8"))["files"]
        return {"unlocked": {id: files[id] for id in ids}}
    except (OSError, ValueError, KeyError, TypeError):
        raise HTTPException(status_code=503, detail="Case data missing or invalid.")


@app.post("/api/progress/reset")
def reset_progress():
    with PROGRESS_LOCK:
        try:
            save_notes("")
        except (OSError, sqlite3.Error):
            raise HTTPException(status_code=503, detail="Notebook could not be reset.")
        save_unlocked_files(set())
    return {"ok": True}


class UnlockRequest(BaseModel):
    """FastAPI checks incoming JSON against these fields before calling unlock."""
    fileId: str = Field(min_length=1, max_length=8)
    answer: str = Field(max_length=128)
    attempt: int = Field(default=1, ge=1, le=10000)


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/unlock")
def unlock(request: UnlockRequest):
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

    expected = answers.get(request.fileId)
    if expected is None:
        return JSONResponse(status_code=404, content={"error": "unknown file"})

    # These are puzzle passwords, so whitespace and letter case should not matter.
    if request.answer.strip().upper() == expected.strip().upper():
        with PROGRESS_LOCK:
            unlocked_files = read_unlocked_files()
            unlocked_files.add(request.fileId)
            save_unlocked_files(unlocked_files)
        return {"ok": True, "file": files[request.fileId]}

    ladder = hints.get(request.fileId, [])
    return {"ok": False, "hints": ladder[:request.attempt]}


@app.get("/api/files/01/image")
def incident_report_image():
    # Start at this Python file's folder, then find our one image.
    image_path = Path(__file__).parent / "assets" / "incidentReport_01.png"

    if not image_path.is_file():
        return JSONResponse(status_code=404, content={"error": "Image not found."})

    # Send the actual image bytes, rather than a JSON description of the image.
    return FileResponse(image_path, media_type="image/png")

@app.get("/api/files/02/image")
def interview_statements_image():
  image_path = Path(__file__).parent / "assets" / "interviewStatements_02.png"

  if not image_path.is_file():
    return JSONResponse(status_code=404, content={"error": "Image not found."})

  return FileResponse(image_path, media_type="image/png")

@app.get("/api/files/04/image")
def security_logs_image(preview: bool = False):
    return locked_image("04", "securityLogs_03.png", preview)


@app.get("/api/files/05/image")
def diamond_report_image(preview: bool = False):
    return locked_image("05", "diamondExamReport_04.png", preview)


@app.get("/api/files/06/image")
def purchase_records_image(preview: bool = False):
    return locked_image("06", "purchaseRecords_05.png", preview)


def locked_image(file_id, filename, preview):
    # A test preview doesn't unlock the record or change game progress.
    with PROGRESS_LOCK:
        if not (preview and ALLOW_TEST_PREVIEW) and file_id not in read_unlocked_files():
            return JSONResponse(status_code=403, content={"error": "File is locked."})
    image_path = Path(__file__).parent / "assets" / filename
    if not image_path.is_file():
        return JSONResponse(status_code=404, content={"error": "Image not found."})
    return FileResponse(image_path, media_type="image/png", headers={"Cache-Control": "no-store"})
