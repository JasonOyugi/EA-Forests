import hashlib
import os
from pathlib import Path
from typing import Protocol
from uuid import uuid4


class ArtifactStore(Protocol):
    def put(self, content: bytes) -> tuple[str, str]: ...
    def get(self, uri: str) -> bytes: ...


class LocalArtifactStore:
    """Opaque URIs avoid persisting machine-specific paths or exposing source files.

    Replacement S3 implementations must preserve content-addressed immutability.
    This directory is private and must never be served as web static content.
    """

    def __init__(self, root: str | Path | None = None):
        self.root = Path(
            root or os.getenv("CANONICAL_ARTIFACT_ROOT", ".cache/canonical-artifacts")
        ).resolve()

    def put(self, content: bytes) -> tuple[str, str]:
        digest = hashlib.sha256(content).hexdigest()
        destination = self.root / digest[:2] / digest
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_name(f".{digest}.{uuid4().hex}.tmp")
        try:
            with temporary.open("xb") as stream:
                stream.write(content)
                stream.flush()
                os.fsync(stream.fileno())
            try:
                # Atomic no-replace publication: concurrent readers never see partial bytes.
                os.link(temporary, destination)
            except FileExistsError:
                if destination.read_bytes() != content:
                    raise ValueError("Artifact content-address collision or corruption")
        finally:
            temporary.unlink(missing_ok=True)
        return f"sha256:{digest}", digest

    def get(self, uri: str) -> bytes:
        scheme, _, digest = uri.partition(":")
        if (
            scheme != "sha256"
            or len(digest) != 64
            or any(c not in "0123456789abcdef" for c in digest)
        ):
            raise ValueError("Invalid artifact URI")
        content = (self.root / digest[:2] / digest).read_bytes()
        if hashlib.sha256(content).hexdigest() != digest:
            raise ValueError("Artifact integrity check failed")
        return content

    def put_file(self, path: str | Path) -> tuple[str, str]:
        """Stream large upstream archives; atomic publication without loading them into RAM."""
        self.root.mkdir(parents=True, exist_ok=True)
        temporary = self.root / f".{uuid4().hex}.tmp"
        sha = hashlib.sha256()
        try:
            with Path(path).open("rb") as source, temporary.open("xb") as target:
                while block := source.read(8 * 1024 * 1024):
                    sha.update(block)
                    target.write(block)
                target.flush()
                os.fsync(target.fileno())
            digest = sha.hexdigest()
            destination = self.root / digest[:2] / digest
            destination.parent.mkdir(parents=True, exist_ok=True)
            try:
                os.link(temporary, destination)
            except FileExistsError:
                with destination.open("rb") as existing:
                    if hashlib.file_digest(existing, "sha256").hexdigest() != digest:
                        raise ValueError("Artifact content-address collision or corruption")
            return f"sha256:{digest}", digest
        finally:
            temporary.unlink(missing_ok=True)

    def verified_path(self, uri: str) -> Path:
        """Private streaming access for GDAL; never expose this path through an API."""
        scheme, _, digest = uri.partition(":")
        if (scheme != "sha256" or len(digest) != 64
                or any(c not in "0123456789abcdef" for c in digest)):
            raise ValueError("Invalid artifact URI")
        path = self.root / digest[:2] / digest
        with path.open("rb") as stream:
            if hashlib.file_digest(stream, "sha256").hexdigest() != digest:
                raise ValueError("Artifact integrity check failed")
        return path
