# Release Workflow

The project release entrypoint is the repository root command surface:

```powershell
.\s.bat release --minor
.\s.bat release --major
```

Command intent:

- `--minor`: bump `x.y.z` to `x.(y+1).0`
- `--major`: bump `x.y.z` to `(x+1).0.0`
- `--dry-run`: preview release changes without committing, tagging, or publishing

## What The Release Workflow Does

- validates git, GitHub CLI, and required local tooling
- resolves the current project version from tracked version files
- bumps the version and synchronizes all version consumers
- refreshes install and update documentation
- writes release notes to `docs/releases/`
- stages the generated changes
- creates a release commit and annotated git tag
- pushes the branch and tag
- publishes a GitHub release with the generated notes

## Safe Preview

```powershell
.\s.bat release --minor --dry-run
```

Dry-run mode prints the planned version bump and validates the release inputs without writing files, tagging commits, or publishing to GitHub.

## Typical Major Release Sequence

```powershell
# 1) verify help and auth
.\s.bat --help
gh auth status

# 2) preview the release plan
.\s.bat release --major --dry-run

# 3) run the release
.\s.bat release --major
```
