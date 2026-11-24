# EA Forests automation

Two bots keep the site current and the local agent tooling healthy. Both run on the
**1st and 15th of each month**, and neither publishes anything without a person's review.

| | Site steward | Skill scout |
|---|---|---|
| Where it runs | GitHub Actions (`.github/workflows/site-steward.yml`) | Hermes cron on the owner's PC |
| When | 08:00 EAT (05:00 UTC) | 09:00 local time, while the Hermes scheduler runs |
| Reads | `automation/sources.json` feeds, the live site | ClawHub, the Hermes official registry, skills.sh |
| Changes | Information Hub cards, via a **draft PR** | Updates installed hub skills, with rollback |
| You approve | By merging the PR | By merging the **"Skill recommendations" PR** it opens |
| Reports | The PR description, or an issue when nothing changed | The PR description, plus Hermes cron output (`%LOCALAPPDATA%\hermes\cron\output`) |

Everything to review shows up in the repository's **Pull requests** tab, and GitHub emails the
owner when one opens: `site-steward` and `skill-recommendations` labels tell them apart.

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
  **It never installs a new skill itself.** Up to five skills whose preview loaded are proposed
  for approval (see below). A skill Hermes could not preview is listed but never proposed.

### Recommendations arrive as a pull request

After each run, the scout pushes a `bot/skill-recommendations-<date>` branch that adds its
recommendations to `automation/skills.json`, using the PC's existing git sign-in. The
[`skill-recommendations`](../.github/workflows/skill-recommendations.yml) workflow then opens a
pull request labelled `skill-recommendations`, with a table of the skills and their previews, and
closes any older recommendation PR that is still open.

- **Approve all:** merge it.
- **Approve some:** in *Files changed*, edit `automation/skills.json`, delete the lines you
  don't want, commit, then merge.
- **Approve none:** close it.

### Approving a skill (installs within the hour)

Merging a recommendations PR is one way. You can also add a skill to `approved` in
[`skills.json`](skills.json) on `main` yourself, for example by editing the file on GitHub:

```json
{ "approved": [ { "identifier": "official/research/parallel-cli", "project": true } ] }
```

The **skill installer** (`skill-scout/install_approved.py`, a Hermes cron job that runs every
hour) then:

1. installs it into Hermes with `hermes skills install <identifier> --yes`. Hermes's security
   scan still applies, and a blocked skill is reported, never forced;
2. with `"project": true`, copies it into `.claude/skills/<name>/` in every local EA-Forests
   worktree, where Claude Code loads project skills. That folder is excluded from git (through
   `.git/info/exclude`), so third-party skills with unclear licences are never published in this
   public repository.

Removing an entry removes the project copies (the Hermes install stays; run
`hermes skills uninstall <name>` to remove that too). The installer only touches folders it
created, which carry a `.ea-forests-managed` marker. It prints nothing when nothing changed,
and its reports go to `%LOCALAPPDATA%\hermes\cron\output`. To check what it would do first:

```bash
python automation/skill-scout/install_approved.py --dry-run
```

**Setup (this PC):**

```powershell
powershell -ExecutionPolicy Bypass -File automation\skill-scout\install-hermes-job.ps1
```

```bash
hermes gateway install
```

The first command copies both scripts into `%LOCALAPPDATA%\hermes\scripts`, writes the
installer's config, and creates or replaces both jobs (the scout and the hourly installer).
By default the scout delivers its report as is, with no model call, because that needs no
provider credentials. Once `hermes status` shows a working model provider, re-run it with
`-WithAgent` to get a short written briefing from `prompt.md` instead. The second command
starts the Hermes scheduler at login. Without it the jobs never fire. To run a job now, use
`hermes cron run <job id>`, and don't put a time limit on it: that command runs the job
itself, so stopping it early kills the job.

Known Hermes 0.20 behaviour, verified on 11 Nov 2026:

- The `anthropic` and `openai` search sources hang for more than 400s, so they are left out.
- `skills update` cannot resolve some ClawHub skills ("No exact match"), but still prints
  "Updated". The scout reports these as *not updated*.
- With `-WithAgent`, the job uses your Hermes default model and provider. A run is blocked
  before it starts if that provider is not logged in (for example, Nous Portal).
