# Release Workflow

Drive Alive releases are created from the repository root.

## Supported Commands

```powershell
.\s.bat release --minor
.\s.bat release --major
.\s.bat release --minor --dry-run
```

## What The Release Workflow Does

- validates git state and required local tooling
- validates GitHub CLI authentication before publish steps
- resolves the current project version from tracked version files
- bumps the version for a minor or major release
- synchronizes version consumers across backend, frontend, packaging, and docs
- refreshes install and update guides
- writes release notes to `docs/releases/`
- creates a release commit and annotated tag
- pushes the branch and tag
- publishes the GitHub release

## Preconditions

- run releases from the `main` branch
- start from a clean git working tree
- ensure `git` and `gh` are installed and on `PATH`
- ensure `gh auth status` succeeds

## Validation

Use a dry-run before a real release:

```powershell
.\s.bat release --minor --dry-run
```

Dry-run mode shows the planned version bump and targeted files without modifying the repository.
