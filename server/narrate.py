"""POST /api/narrate: ElevenLabs text-to-speech proxy, one voice per character. Port of web/dev-api/narrate.ts.

Only character speech is narrated (chat messages, interview statements, emails written by a character); the site sends
{speaker, text}. The speaker key picks the voice from server/voices.json. The API key stays on the server, and audio is
cached by hash of (voice, model, text).
"""
import hashlib
import json
import os
import re
import time
from pathlib import Path

import httpx

MAX_CHARS = 2500
VOICES_PATH = Path(__file__).parent / "voices.json"
_cache = {}
_hits = {}


def speakers():
    """{speaker: {"name": ..., "voice": ...}} from voices.json. A per-speaker env var wins: ELEVEN_LABS_VOICE_<SPEAKER>."""
    data = json.loads(VOICES_PATH.read_text(encoding="utf-8"))["speakers"]
    out = {}
    for key, entry in data.items():
        voice = os.environ.get(f"ELEVEN_LABS_VOICE_{key.upper()}") or entry["voice"]
        out[key] = {"name": entry["name"], "voice": voice}
    return out


def configured():
    key = os.environ.get("ELEVEN_LABS_API_KEY", "")
    return bool(key) and not key.startswith("insert_")


def rate_limited(key, limit=40, window=60):
    # A chat thread is one request per message, so allow a thread or two per minute.
    now = time.monotonic()
    recent = [t for t in _hits.get(key, []) if now - t < window]
    recent.append(now)
    _hits[key] = recent
    return len(recent) > limit


async def narrate(speaker, text, client_key, transport=None):
    """Returns (status, audio_bytes_or_None, error_or_None)."""
    voices = speakers()
    if speaker not in voices:
        return 400, None, "Unknown speaker."
    if not configured():
        return 503, None, "Narration is not configured on this server."
    if rate_limited(client_key):
        return 429, None, "Too many narration requests. Wait a moment."
    text = re.sub(r"\s+", " ", text or "").strip()
    if not text:
        return 400, None, "Nothing to narrate."
    if len(text) > MAX_CHARS:
        return 413, None, f"Text is too long (max {MAX_CHARS} characters)."

    voice = voices[speaker]["voice"]
    model = os.environ.get("ELEVEN_LABS_MODEL") or "eleven_multilingual_v2"
    digest = hashlib.sha256(f"{voice}|{model}|{text}".encode()).hexdigest()
    if digest in _cache:
        return 200, _cache[digest], None
    try:
        async with httpx.AsyncClient(timeout=25, transport=transport) as client:
            res = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128",
                headers={"xi-api-key": os.environ["ELEVEN_LABS_API_KEY"]},
                json={"text": text, "model_id": model},
            )
        if res.status_code != 200:
            print(f"[narrate] ElevenLabs returned HTTP {res.status_code} for speaker {speaker}: {res.text[:300]}")
            return 502, None, "The voice is unavailable right now."
        _cache[digest] = res.content
        return 200, res.content, None
    except Exception as err:
        print(f"[narrate] ElevenLabs call failed: {err}")
        return 502, None, "The voice is unavailable right now."


async def describe_voices(transport=None):
    """Dev tool: name, gender, accent and description of every configured voice, as ElevenLabs reports them."""
    out = []
    async with httpx.AsyncClient(timeout=15, transport=transport) as client:
        for key, entry in speakers().items():
            row = {"speaker": key, "character": entry["name"], "voice": entry["voice"]}
            if not configured():
                row["error"] = "No ElevenLabs key set"
            else:
                try:
                    res = await client.get(f"https://api.elevenlabs.io/v1/voices/{entry['voice']}", headers={"xi-api-key": os.environ["ELEVEN_LABS_API_KEY"]})
                    if res.status_code == 200:
                        info = res.json()
                        labels = info.get("labels") or {}
                        row.update(name=info.get("name"), gender=labels.get("gender"), accent=labels.get("accent"), age=labels.get("age"),
                                   description=labels.get("description") or info.get("description"), category=info.get("category"))
                    elif res.status_code in (401, 403):
                        # A restricted key can speak without being allowed to read voice details.
                        row["note"] = 'Details hidden: this API key lacks the "voices: read" permission. The voice can still be played.'
                    else:
                        row["error"] = f"ElevenLabs HTTP {res.status_code} (is this voice added to the account?)"
                except Exception as err:
                    row["error"] = f"{err}"
            out.append(row)
    return out


if __name__ == "__main__":
    # python -m server.narrate : prints the table so you can check who sounds like whom.
    import asyncio

    from .envfile import load_env_files

    load_env_files(Path(__file__).resolve().parent.parent / ".env")
    for r in asyncio.run(describe_voices()):
        print(f"{r['speaker']:<11}{r['character']:<17}{r['voice']}  {r.get('name') or ''} | {r.get('gender') or '?'} | {r.get('accent') or '?'} | {r.get('description') or ''} {r.get('error') or ''}")
