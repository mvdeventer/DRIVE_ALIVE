# Drive Alive — Changelog

All code improvements per release, newest first. Generated automatically
by the release workflow (`s.bat minor` / `s.bat major` / `s.bat release`).

## v10.0.1 — 2026-08-13 (Patch Release 10.0.1)

> Drive Alive v10.0.1 — 2 fixs, 1 maintenance update across 22 files (+554/-264 lines). Top highlight: make the Database Interface search actually search, and run its tests. Full details in CHANGES.md.

### Bug Fixes
- fix: make the Database Interface search actually search, and run its tests
- fix: close the remaining gaps in the instructor verification workflow

### Maintenance & Tooling
- ci: get the GitHub Actions run green again

**Scope:** 3 commits, 22 files changed, 554 insertions(+), 264 deletions(-) — touched: frontend: 15, backend: 3, docs: 2, scripts: 2

## v10.0.0 — 2026-08-13 (Major Release 10.0.0)

> Drive Alive v10.0.0 — 1 fix across 20 files (+1375/-164 lines). Top highlight: repair instructor verification workflow and admin dashboard usability. Full details in CHANGES.md.

### Bug Fixes
- fix: repair instructor verification workflow and admin dashboard usability

**Scope:** 1 commits, 20 files changed, 1375 insertions(+), 164 deletions(-) — touched: frontend: 14, backend: 3, docs: 2, (root): 1

## v9.0.0 — 2026-08-13 (Major Release 9.0.0)

> Drive Alive v9.0.0 — 5 fixs, 2 maintenance updates, 1 other improvement, 1 new feature across 128 files (+15448/-2517 lines). Top highlight: company-paid revenue model, recruitment and solo instructors. Full details in CHANGES.md.

### New Features
- feat: company-paid revenue model, recruitment and solo instructors

### Bug Fixes
- fix: stop bootstrap crashing on its own success message
- fix: solo instructor approval, booking oversight counts, and email rendering
- fix: require authentication by default, and stop billing cancelled lessons
- fix: derive backup purge order from the model dependency graph
- fix: make backups restorable, and restore non-destructive

### Maintenance & Tooling
- chore: add MapPreview type declaration and ignore agent runtime state
- chore: commit pre-existing working-tree changes

### Other Improvements
- merge: company revenue model, recruitment, solo instructors and test-run fixes

**Scope:** 9 commits, 128 files changed, 15448 insertions(+), 2517 deletions(-) — touched: backend: 59, frontend: 57, (root): 5, docs: 4, .claude: 2, scripts: 1

## v8.1.0 — 2026-08-04 (Minor Release 8.1.0)

> Drive Alive v8.1.0 — 5 new features, 1 fix, 4 maintenance updates, 4 other improvements across 522 files (+67541/-5389 lines). Top highlight: admin-created accounts, en/af locale rework, release-safety tooling. Full details in CHANGES.md.

### New Features
- feat: admin-created accounts, en/af locale rework, release-safety tooling
- feat: design-token system, responsive foundation, a11y pass, agent toolkit
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

**Scope:** 17 commits, 522 files changed, 67541 insertions(+), 5389 deletions(-) — touched: .claude: 256, frontend: 116, backend: 107, (root): 20, docs: 8, .claude-flow: 4, scripts: 4, backups: 2, .agents: 1, .codacy: 1, .githooks: 1, .github: 1, dist: 1

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

