#!/usr/bin/env python3
"""Installs the skills approved in automation/skills.json, run hourly by `hermes cron`.

Approval is an entry in automation/skills.json on the main branch. Each run:
1. Reads the approved list from GitHub (raw file on main; no token needed for a public repo).
2. Installs each approved skill into Hermes with `hermes skills install <id> --yes`. The
   security scan still applies: a blocked skill is reported, never forced.
3. For entries with "project": true, copies the installed skill into the git-ignored
   .claude/skills/<name>/ folder of every local worktree of the repository, where Claude Code
   loads project skills. Copies it made are marked, so it only ever updates or removes its own.

Prints nothing when nothing changed, so the no-agent cron job stays silent.
Standard library only. Configuration: <HERMES_HOME>/skill-scout/config.json, written by
install-hermes-job.ps1: {"repo": "<path to any checkout>", "approvals_url": "<raw URL>"}.
Usage: python install_approved.py [--dry-run] [--approvals <local file instead of the URL>]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

HOME = Path(os.environ.get("HERMES_HOME") or Path(__file__).resolve().parent.parent)
SKILLS_DIR = HOME / "skills"
LOCK = SKILLS_DIR / ".hub" / "lock.json"
STATE_DIR = HOME / "skill-scout"
CONFIG = STATE_DIR / "config.json"
HERMES = shutil.which("hermes") or str(HOME / "hermes-agent" / "bin" / ("hermes.exe" if os.name == "nt" else "hermes"))
ENV = {**os.environ, "NO_COLOR": "1", "COLUMNS": "220", "PYTHONIOENCODING": "utf-8", "TERM": "dumb"}
MARKER = ".ea-forests-managed"
PROJECT_DIR = Path(".claude") / "skills"


def read_lock() -> dict:
    try:
        return json.loads(LOCK.read_text(encoding="utf-8")).get("installed", {})
    except (OSError, ValueError):
        return {}


def find_installed(identifier: str, lock: dict) -> tuple[str, dict] | None:
    short = identifier.rstrip("/").split("/")[-1].lower()
    for name, entry in lock.items():
        if entry.get("identifier", "").lower() == identifier.lower():
            return name, entry
    for name, entry in lock.items():
        if name.lower() == short:
            return name, entry
    return None


def load_approvals(args, config: dict) -> list[dict]:
    if args.approvals:
        raw = Path(args.approvals).read_text(encoding="utf-8")
    else:
        url = config["approvals_url"]
        req = urllib.request.Request(url, headers={"User-Agent": "ea-forests-skill-installer", "Cache-Control": "no-cache"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
    entries = json.loads(raw).get("approved", [])
    clean = []
    for e in entries:
        if isinstance(e, str):
            e = {"identifier": e}
        if isinstance(e, dict) and isinstance(e.get("identifier"), str) and e["identifier"].strip():
            clean.append({"identifier": e["identifier"].strip(), "project": bool(e.get("project", True))})
    return clean


def worktrees(repo: str) -> list[Path]:
    out = subprocess.run(["git", "-C", repo, "worktree", "list", "--porcelain"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    paths = [Path(line[9:].strip()) for line in out.stdout.splitlines() if line.startswith("worktree ")]
    return [p for p in paths if p.exists()]


def ensure_ignored(repo: str) -> None:
    """Keep project copies out of git in every worktree, whatever branch it is on."""
    common = subprocess.run(["git", "-C", repo, "rev-parse", "--git-common-dir"], capture_output=True, text=True).stdout.strip()
    if not common:
        return
    common_path = Path(common) if Path(common).is_absolute() else Path(repo) / common
    exclude = common_path / "info" / "exclude"
    exclude.parent.mkdir(parents=True, exist_ok=True)
    text = exclude.read_text(encoding="utf-8") if exclude.exists() else ""
    if "/.claude/skills/" not in text.splitlines():
        exclude.write_text(text.rstrip("\n") + "\n# Skills copied in by the EA Forests skill installer\n/.claude/skills/\n", encoding="utf-8")


def tree_hash(path: Path) -> str:
    h = hashlib.sha256()
    for f in sorted(p for p in path.rglob("*") if p.is_file() and p.name != MARKER):
        h.update(str(f.relative_to(path)).encode())
        h.update(f.read_bytes())
    return h.hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="report what would change; install and copy nothing")
    ap.add_argument("--approvals", help="read approvals from this local file instead of GitHub")
    args = ap.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    config = json.loads(CONFIG.read_text(encoding="utf-8")) if CONFIG.exists() else {}
    if not config.get("repo") or (not config.get("approvals_url") and not args.approvals):
        print(f"Skill installer is not configured: {CONFIG} needs repo and approvals_url. Re-run install-hermes-job.ps1.")
        return 1

    lines: list[str] = []
    try:
        approved = load_approvals(args, config)
    except urllib.error.HTTPError as exc:
        if exc.code == 404:  # automation/skills.json is not on main yet: nothing is approved
            return 0
        print(f"Could not read the approved skills list: {exc}")
        return 1
    except Exception as exc:  # network or JSON problem: say so, change nothing
        print(f"Could not read the approved skills list: {exc}")
        return 1

    lock = read_lock()
    to_project: dict[str, Path] = {}
    for entry in approved:
        ident = entry["identifier"]
        found = find_installed(ident, lock)
        if not found:
            if args.dry_run:
                lines.append(f"- would install `{ident}` into Hermes")
                continue
            code, out = 0, ""
            try:
                p = subprocess.run([HERMES, "skills", "install", ident, "--yes"], capture_output=True, text=True,
                                   encoding="utf-8", errors="replace", timeout=900, env=ENV, stdin=subprocess.DEVNULL)
                code, out = p.returncode, (p.stdout or "") + (p.stderr or "")
            except subprocess.TimeoutExpired:
                code, out = 124, "timed out after 900s"
            lock = read_lock()
            found = find_installed(ident, lock)
            if found:
                verdict = found[1].get("scan_verdict", "unknown")
                lines.append(f"- installed `{ident}` into Hermes (scan verdict: {verdict})")
            else:
                reason = "blocked by the security scan" if "blocked" in out.lower() else (out.strip().splitlines() or [f"exit {code}"])[-1][:200]
                lines.append(f"- could not install `{ident}`: {reason}")
                continue
        if entry["project"] and found:
            name, info = found
            src = SKILLS_DIR / info.get("install_path", name)
            if (src / "SKILL.md").exists():
                to_project[name] = src
            else:
                lines.append(f"- `{name}` is installed but has no SKILL.md at {src}; not copied to the project")

    # Copy approved skills into each worktree; remove copies of skills no longer approved.
    trees = worktrees(config["repo"])
    if not args.dry_run:
        ensure_ignored(config["repo"])
    for tree in trees:
        target_root = tree / PROJECT_DIR
        for name, src in to_project.items():
            dest = target_root / name
            if dest.exists() and not (dest / MARKER).exists():
                lines.append(f"- left {dest} alone: it was not created by the installer")
                continue
            if dest.exists() and tree_hash(dest) == tree_hash(src):
                continue
            if args.dry_run:
                lines.append(f"- would copy `{name}` into {target_root}")
                continue
            if dest.exists():
                shutil.rmtree(dest)
            shutil.copytree(src, dest)
            (dest / MARKER).write_text("Copied by the EA Forests skill installer. Remove the entry from automation/skills.json to remove this folder.\n", encoding="utf-8")
            lines.append(f"- copied `{name}` into {target_root}")
        if target_root.exists():
            for dest in target_root.iterdir():
                if dest.is_dir() and (dest / MARKER).exists() and dest.name not in to_project:
                    if args.dry_run:
                        lines.append(f"- would remove `{dest.name}` from {target_root} (no longer approved)")
                    else:
                        shutil.rmtree(dest)
                        lines.append(f"- removed `{dest.name}` from {target_root} (no longer approved)")

    if lines:
        print("# Skill installer" + (" (dry run)" if args.dry_run else ""))
        print(f"{len(approved)} approved skill(s); {len(trees)} worktree(s).\n")
        print("\n".join(lines))
    return 0


if __name__ == "__main__":
    sys.exit(main())
