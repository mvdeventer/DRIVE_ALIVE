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

## Installer Build In Every Release

Every non-dry-run release now executes this build chain before commit/tag/publish:

- `python bootstrap.py --bundle`
- `npm --prefix frontend run build:web`
- `backend\\venv\\Scripts\\python.exe -m PyInstaller drive-alive.spec --clean`
- `ISCC scripts\\installer.iss`

The installer is saved locally as `dist/DriveAlive-Setup-<version>.exe` and attached to the corresponding GitHub release.
