#!/usr/bin/env python3
"""Skill scout for Hermes, run by `hermes cron` on the 1st and 15th.

1. Updates skills already installed from a hub, safely. `hermes skills update` reinstalls
   with force=True, which skips the security-scan block. So each skill is backed up first,
   and the update is rolled back if the new version scans worse than the old one or is
   'dangerous'.
2. Searches ClawHub and the official registries for skills relevant to EA Forests work,
   previews the most promising ones with `hermes skills inspect`, and prints a report.
   It never installs a new skill. The cron agent turns the report into recommendations.

Stdout is injected into the cron agent's prompt. Standard library only.
Usage: python scout_skills.py [--no-updates] [--no-search] [--max-inspect 10]
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

# What EA Forests work needs: forestry analytics, geospatial, sector research, a premium
# React/Vite site on Vercel, data products and reports.
QUERIES = [
    "forestry", "geospatial", "remote sensing", "google earth engine", "gis mapping",
    "web scraping", "deep research", "market research", "frontend design", "react vite",
    "data visualization", "seo", "accessibility", "excel spreadsheet", "pdf report", "carbon",
]
# The anthropic and openai sources hung past 400s in testing (Nov 2026), so they are left out.
SOURCES = ["clawhub", "official", "skills-sh"]
SEARCH_TIMEOUT = 150
TRUST_RANK = {"builtin": 0, "official": 0, "trusted": 1, "community": 2}
VERDICT_RANK = {"safe": 0, "caution": 1, "dangerous": 2}
CALL_TIMEOUT = 300

HOME = Path(os.environ.get("HERMES_HOME") or Path(__file__).resolve().parent.parent)
SKILLS_DIR = HOME / "skills"
LOCK = SKILLS_DIR / ".hub" / "lock.json"
STATE_DIR = HOME / "skill-scout"
HERMES = shutil.which("hermes") or str(HOME / "hermes-agent" / "bin" / ("hermes.exe" if os.name == "nt" else "hermes"))
ENV = {**os.environ, "NO_COLOR": "1", "COLUMNS": "220", "PYTHONIOENCODING": "utf-8", "TERM": "dumb"}


def hermes(*args: str, timeout: int = CALL_TIMEOUT) -> tuple[int, str]:
    try:
        p = subprocess.run([HERMES, *args], capture_output=True, text=True, encoding="utf-8",
                           errors="replace", timeout=timeout, env=ENV, stdin=subprocess.DEVNULL)
        return p.returncode, (p.stdout or "") + (p.stderr or "")
    except subprocess.TimeoutExpired:
        return 124, f"timed out after {timeout}s"
    except OSError as exc:
        return 127, str(exc)


def read_lock() -> dict:
    try:
        return json.loads(LOCK.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"version": 1, "installed": {}}


def write_lock(data: dict) -> None:
    LOCK.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def installed_names() -> set[str]:
    names = {n.lower() for n in read_lock().get("installed", {})}
    for entry in read_lock().get("installed", {}).values():
        names.add(str(entry.get("identifier", "")).lower())
    for skill_md in SKILLS_DIR.rglob("SKILL.md"):
        if ".hub" in skill_md.parts:
            continue
        names.add(skill_md.parent.name.lower())
        m = re.search(r"^name:\s*['\"]?([^'\"\n]+)", skill_md.read_text(encoding="utf-8", errors="replace")[:2000], re.M)
        if m:
            names.add(m.group(1).strip().lower())
    return names


def available_updates() -> tuple[list[str], str | None]:
    code, out = hermes("skills", "check", timeout=600)
    if code != 0 and "update" not in out:
        return [], out.strip()[-300:]
    names = []
    for line in out.splitlines():
        cells = [c.strip() for c in re.split(r"[│|]", line) if c.strip()]
        if len(cells) >= 3 and cells[-1] == "update_available":
            names.append(cells[0])
    return names, None


def safe_update(name: str, backup_root: Path) -> dict:
    lock = read_lock()
    before = lock.get("installed", {}).get(name)
    if not before:
        return {"skill": name, "result": "skipped", "detail": "not in the hub lockfile"}
    skill_dir = SKILLS_DIR / before.get("install_path", name)
    backup = backup_root / name
    if skill_dir.exists():
        shutil.copytree(skill_dir, backup, dirs_exist_ok=True)

    code, out = hermes("skills", "update", name, timeout=600)
    after = read_lock().get("installed", {}).get(name, {})
    old_v, new_v = before.get("scan_verdict", "safe"), after.get("scan_verdict", "unknown")
    changed = after.get("content_hash") != before.get("content_hash")

    worse = VERDICT_RANK.get(new_v, 2) > VERDICT_RANK.get(old_v, 2)
    if code != 0 or new_v == "dangerous" or new_v == "unknown" or worse:
        # Put the previous version back, files and lock entry both.
        if skill_dir.exists():
            shutil.rmtree(skill_dir)
        if backup.exists():
            shutil.copytree(backup, skill_dir)
        data = read_lock()
        data.setdefault("installed", {})[name] = before
        write_lock(data)
        reason = out.strip().splitlines()[-1][:200] if code != 0 and out.strip() else f"scan verdict went from {old_v} to {new_v}"
        return {"skill": name, "result": "rolled back", "detail": reason}
    if not changed:
        # Hermes 0.20 prints "Updated" even when it could not resolve the skill upstream.
        if "No exact match" in out or "not found" in out.lower():
            return {"skill": name, "result": "not updated", "detail": "Hermes could not resolve it on its registry; reinstall by full identifier if you still want it"}
        return {"skill": name, "result": "no change", "detail": f"upstream content identical; verdict {new_v}"}
    findings = len((after.get("scan_provenance") or {}).get("findings", []))
    return {"skill": name, "result": "updated", "detail": f"verdict {new_v}" + (f", {findings} finding(s)" if findings else "")}


def search(query: str, source: str) -> tuple[str, str, list[dict], str | None]:
    code, out = hermes("skills", "search", query, "--source", source, "--limit", "6", "--json", timeout=SEARCH_TIMEOUT)
    start, end = out.find("["), out.rfind("]")
    if start == -1 or end == -1:
        return query, source, [], (out.strip()[-160:] or f"exit {code}")
    try:
        return query, source, json.loads(out[start:end + 1]), None
    except ValueError:
        return query, source, [], "unreadable JSON"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-updates", action="store_true")
    ap.add_argument("--no-search", action="store_true")
    ap.add_argument("--max-inspect", type=int, default=10)
    args = ap.parse_args()

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    state_file = STATE_DIR / "state.json"
    state = json.loads(state_file.read_text(encoding="utf-8")) if state_file.exists() else {}
    seen_before = set(state.get("candidates", []))

    print(f"# Skill scout report, {today}\n")
    print(f"Hermes home: {HOME}\n")

    # 1. Updates ------------------------------------------------------------
    pending, check_error = available_updates()
    print("## Updates to installed hub skills\n")
    if check_error:
        print(f"Update check failed: {check_error}\n")
    elif not pending:
        print("All hub skills are current.\n")
    elif args.no_updates:
        print("Updates available (not applied, --no-updates): " + ", ".join(pending) + "\n")
    else:
        backup_root = STATE_DIR / "backups" / today
        backup_root.mkdir(parents=True, exist_ok=True)
        print("| Skill | Result | Detail |\n|---|---|---|")
        for name in pending:
            r = safe_update(name, backup_root)
            print(f"| {r['skill']} | {r['result']} | {r['detail']} |")
        print(f"\nBackups of the previous versions: {backup_root}\n")

    if args.no_search:
        return 0

    # 2. Search -------------------------------------------------------------
    have = installed_names()
    jobs = [(q, s) for q in QUERIES for s in SOURCES]
    found: dict[str, dict] = {}
    failures = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        for query, source, results, error in pool.map(lambda j: search(*j), jobs):
            if error:
                failures.append(f"{source}:{query} ({error})")
            for item in results:
                ident = item.get("identifier") or item.get("name")
                if not ident:
                    continue
                entry = found.setdefault(ident, {**item, "queries": set()})
                entry["queries"].add(query)

    candidates = [
        c for c in found.values()
        if c["identifier"].lower() not in have and str(c.get("name", "")).lower() not in have
        and c["identifier"].split("/")[-1].lower() not in have
    ]
    for c in candidates:
        c["score"] = 2 * len(c["queries"]) + (3 - TRUST_RANK.get(c.get("trust_level", "community"), 2))
        c["new"] = c["identifier"] not in seen_before
    candidates.sort(key=lambda c: (-c["score"], c["identifier"]))

    # 3. Preview the best ones ----------------------------------------------
    top = candidates[: args.max_inspect]
    with ThreadPoolExecutor(max_workers=4) as pool:
        # Hermes 0.20 often hangs resolving ClawHub and skills.sh skills, so keep this short.
        previews = list(pool.map(lambda c: hermes("skills", "inspect", c["identifier"], timeout=120)[1], top))

    print("## Candidate skills not installed\n")
    print(f"{len(jobs)} searches across {', '.join(SOURCES)}; {len(found)} results; "
          f"{len(candidates)} not already installed. Top {len(top)} previewed below.\n")
    for c, preview in zip(top, previews):
        flag = " (new since last run)" if c["new"] else ""
        print(f"### {c.get('name', c['identifier'])}{flag}")
        print(f"- Identifier: `{c['identifier']}`  Source: {c.get('source')}  Trust: {c.get('trust_level')}")
        print(f"- Matched: {', '.join(sorted(c['queries']))}")
        print(f"- Description: {c.get('description', '').strip()[:300]}")
        print("\n```\n" + preview.strip()[:2500] + "\n```\n")
    if len(candidates) > len(top):
        print("Other candidates: " + ", ".join(f"`{c['identifier']}`" for c in candidates[len(top):len(top) + 25]) + "\n")
    if failures:
        print(f"Searches that failed ({len(failures)}): " + "; ".join(failures[:12]) + "\n")

    state_file.write_text(json.dumps({"updatedAt": today, "candidates": [c["identifier"] for c in candidates]}, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
