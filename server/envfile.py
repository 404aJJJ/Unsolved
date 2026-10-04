"""Tiny .env loader so local runs pick up the repo-root .env without another dependency.

Real environment variables (Docker, systemd, the Vultr host) always win over the file.
"""
import os
from pathlib import Path


def load_env_files(*paths):
    for path in paths:
        try:
            lines = Path(path).read_text(encoding="utf-8").splitlines()
        except OSError:
            continue
        for line in lines:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key.strip(), value)


def configured(name):
    """True when a secret is set to something other than the .env.example placeholder."""
    value = os.environ.get(name, "")
    return bool(value) and not value.startswith("insert_")
