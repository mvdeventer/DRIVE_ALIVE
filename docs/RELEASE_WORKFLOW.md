# Release Workflow

The project release entrypoint is the repository root command surface:

```powershell
.\s.bat release --minor
.\s.bat release --major
```

## What The Release Workflow Does

- validates git, GitHub CLI, and required local tooling
- resolves the current project version from tracked version files
- bumps the version and synchronizes all version consumers
- refreshes install and update documentation
- writes release notes to `docs/releases/`
- rebuilds offline dependency bundles and installer artifacts
- stages the generated changes
- creates a release commit and annotated git tag
- pushes the branch and tag
- publishes a GitHub release with generated notes and installer EXE asset

## Safe Preview

```powershell
.\s.bat release --minor --dry-run
```

Dry-run mode prints the planned version bump and validates the release inputs without writing files, tagging commits, or publishing to GitHub.

## Pre-Release Quality Gates

Run these before publishing a release or tagging a release candidate:

```powershell
npm --prefix frontend run i18n:check-completeness
npm --prefix frontend run i18n:detect-hardcoded
python scripts/check_error_code_mapping.py
```

If any gate fails, fix the relevant locale keys, hardcoded text, or backend/frontend error mapping before continuing.
