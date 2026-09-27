"""Serverless entrypoint (Vercel Python runtime). Cloud Run uses the Dockerfile instead."""

import sys
from pathlib import Path

# Vercel runs this file from api/; make the backend root importable so `app` resolves.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402

__all__ = ["app"]
