# Drive Alive — Changelog

All code improvements per release, newest first. Generated automatically
by the release workflow (`s.bat minor` / `s.bat major` / `s.bat release`).

## v8.0.0 — 2026-06-12 (Major Release 8.0.0)

> Drive Alive v8.0.0 — version maintenance only across 0 files. Full details in CHANGES.md.

**Scope:** 0 commits, no file changes detected

## v7.2.0 — 2026-06-12 (Minor Release 7.2.0)

> Drive Alive v7.2.0 — 1 fix, 4 maintenance updates, 3 new features, 4 other improvements across 140 files (+4082/-2299 lines). Top highlight: auto-generated CHANGES.md + summary on tags and releases. Full details in CHANGES.md.

### New Features
- feat(release): auto-generated CHANGES.md + summary on tags and releases
- feat(cli): self-updating help, one-command minor/major releases
- feat(payments): hybrid commission platform fee

### Bug Fixes
- fix(cli): reject unknown arguments, lock against concurrent releases

### Maintenance & Tooling
- chore: refresh frontend lockfile after node_modules repair
- chore: pre-release commit (minor bump)
- chore: commit pending production-hardening and project work
- chore: uninstall --all flag, untrack runtime artifacts

### Other Improvements
- auth: centralize runtime role readiness gating
- auth: centralize login role picker policy
- auth: centralize role transition policy
- auth: enforce instructor verification for all roles

**Scope:** 13 commits, 140 files changed, 4082 insertions(+), 2299 deletions(-) — touched: backend: 89, frontend: 29, (root): 9, docs: 6, scripts: 3, .claude: 1, .codacy: 1, .github: 1, dist: 1

