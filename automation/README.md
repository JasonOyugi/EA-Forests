# EA Forests automation

Two bots keep the site current and the local agent tooling healthy. Both run on the
**1st and 15th of each month**, and neither publishes anything without a person's review.

| | Site steward | Skill scout |
|---|---|---|
| Where it runs | GitHub Actions (`.github/workflows/site-steward.yml`) | Hermes cron on the owner's PC |
| When | 08:00 EAT (05:00 UTC) | 09:00 local time, while the Hermes scheduler runs |
| Reads | `automation/sources.json` feeds, the live site | ClawHub, the Hermes official registry, skills.sh |
| Changes | Information Hub cards, via a **draft PR** | Updates installed hub skills, with rollback |
| Reports | The PR description, or an issue when nothing changed | Hermes cron output (`%LOCALAPPDATA%\hermes\cron\output`) |

## Site steward

1. `site-steward/fetch-sources.mjs` reads every feed in `sources.json` and keeps items from the
   last 21 days that mention the sector and East Africa and are not already cited on the site.
   For HTML pages (NFA, TFS, KEFRI, ITTO, FAO) it reports headline links that are new since the
   last run. The first run only records a baseline.
2. `site-steward/check-site.mjs` crawls eaforests.com in Chromium at desktop and 390px mobile
   widths. It records pages that fail or show the not-found screen, images that do not load,
   console errors, sideways scrolling on phones, slow loads and dead outbound links. It also
   saves screenshots.
3. Claude Code (`claude -p`, headless) follows `site-steward/prompt.md`. It triages the items,
   opens and verifies each source, writes at most six new hub cards to the rules in `DESIGN.md`,
   type-checks its edit, and writes a digest.
4. The workflow reverts any change outside the hub data files, runs the build, and opens a draft
   PR against `release/public-market`. A run with nothing to add opens an issue instead.
   Reports and screenshots are kept as a run artifact for 90 days.

**One-time setup (GitHub):**

1. Add a repository secret: `CLAUDE_CODE_OAUTH_TOKEN` (run `claude setup-token` locally) or
   `ANTHROPIC_API_KEY`.
2. Settings → Actions → General → Workflow permissions: allow GitHub Actions to create pull requests.
3. Optional repository variables: `STEWARD_MODEL` (default `sonnet`), `STEWARD_MAX_BUDGET_USD`
   (default `5`), `STEWARD_TARGET_BRANCH` (default `release/public-market`).
4. The schedule only runs from the default branch, so merge this into `main`. Then trigger a
   first run from the Actions tab with **dry run** ticked.

The repository is public, so digests and PRs are public. They contain only public sources.

**Adding a source:** add an entry to `sources.json` (`rss` for feeds, `page` for HTML pages),
then run it locally:

```bash
node automation/site-steward/fetch-sources.mjs --site . --out /tmp/sources.json
```

## Skill scout

`skill-scout/scout_skills.py` runs as the cron job's pre-run script, and its output becomes the
cron agent's prompt together with `skill-scout/prompt.md`.

- **Updates:** `hermes skills update` reinstalls with `force=True`, which skips Hermes's
  security-scan block. So the scout backs up each skill, updates it, and rolls back if the new
  version scans worse than before or as `dangerous`. Backups go to `%LOCALAPPDATA%\hermes\skill-scout\backups`.
- **New skills:** it searches the registries for EA Forests topics (`QUERIES` in the script),
  drops anything already installed, and previews the top ten with `hermes skills inspect`.
  **It never installs a new skill.** The briefing recommends up to three with the exact
  `hermes skills install` command for you to run.

**Setup (this PC):**

```powershell
powershell -ExecutionPolicy Bypass -File automation\skill-scout\install-hermes-job.ps1
```

```bash
hermes gateway install
```

The first command copies the script into `%LOCALAPPDATA%\hermes\scripts` and creates or
replaces the job. The second starts the Hermes scheduler at login. Without it the job never
fires. Run the job on demand with `hermes cron run <job id>`, then `hermes cron tick`.

Known Hermes 0.20 behaviour, verified on 11 Nov 2026:

- The `anthropic` and `openai` search sources hang for more than 400s, so they are left out.
- `skills update` cannot resolve some ClawHub skills ("No exact match"), but still prints
  "Updated". The scout reports these as *not updated*.
- The cron agent uses your Hermes default model unless the job sets `--model`.
