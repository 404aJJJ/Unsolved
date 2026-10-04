"""POST /api/narrate: ElevenLabs text-to-speech proxy. Port of web/dev-api/narrate.ts.

The API key stays on the server. Audio is cached by hash of (voice, model, text).
"""
import hashlib
import os
import re
import time

import httpx

MAX_CHARS = 2500
DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb"
_cache = {}
_hits = {}


def configured():
    key = os.environ.get("ELEVEN_LABS_API_KEY", "")
    return bool(key) and not key.startswith("insert_")


def voice_id():
    return os.environ.get("ELEVEN_LABS_VOICE_ID") or DEFAULT_VOICE


def rate_limited(key, limit=20, window=60):
    now = time.monotonic()
    recent = [t for t in _hits.get(key, []) if now - t < window]
    recent.append(now)
    _hits[key] = recent
    return len(recent) > limit


async def narrate(text, client_key, transport=None):
    """Returns (status, audio_bytes_or_None, error_or_None)."""
    if not configured():
        return 503, None, "Narration is not configured on this server."
    if rate_limited(client_key):
        return 429, None, "Too many narration requests. Wait a moment."
    text = re.sub(r"\s+", " ", text or "").strip()
    if not text:
        return 400, None, "Nothing to narrate."
    if len(text) > MAX_CHARS:
        return 413, None, f"Text is too long (max {MAX_CHARS} characters)."

    voice = voice_id()
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
            print(f"[narrate] ElevenLabs returned HTTP {res.status_code}: {res.text[:300]}")
            return 502, None, "The narrator is unavailable right now."
        _cache[digest] = res.content
        return 200, res.content, None
    except Exception as err:
        print(f"[narrate] ElevenLabs call failed: {err}")
        return 502, None, "The narrator is unavailable right now."
