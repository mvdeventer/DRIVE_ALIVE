from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

from release_helpers import build_release_installer, stage_paths
from release_templates import install_guide, release_workflow_guide, update_guide

ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"
DOCS_DIR = ROOT / "docs"
RELEASES_DIR = DOCS_DIR / "releases"
DIST_DIR = ROOT / "dist"

VERSION_FILE = ROOT / "VERSION"
VERSION_JSON_FILE = ROOT / "version.json"
CHANGES_FILE = ROOT / "CHANGES.md"
README_FILE = ROOT / "README.md"
FRONTEND_APP_FILE = FRONTEND_DIR / "app.json"
FRONTEND_PACKAGE_FILE = FRONTEND_DIR / "package.json"
BACKEND_SETUP_FILE = BACKEND_DIR / "setup.py"
BACKEND_SPEC_FILE = BACKEND_DIR / "drive-alive.spec"
BACKEND_FILE_VERSION_FILE = BACKEND_DIR / "file_version_info.txt"
INSTALLER_FILE = ROOT / "scripts" / "installer.iss"
INSTALL_GUIDE_FILE = DOCS_DIR / "INSTALL_WINDOWS.md"
UPDATE_GUIDE_FILE = DOCS_DIR / "UPDATE_WINDOWS.md"
RELEASE_WORKFLOW_FILE = DOCS_DIR / "RELEASE_WORKFLOW.md"
SESSION_REPORT_MD = DOCS_DIR / "session-code-change-report.md"
SESSION_REPORT_DOCX = DOCS_DIR / "session-code-change-report.docx"
INSTALL_MANIFEST_FILE = DIST_DIR / "install-manifest.json"

IGNORED_DIRTY_PREFIXES = (
    "backend/.backend.pid",
    "frontend/.frontend.pid",
    "backend/backups/",
    "docs/~$",
    "docs/session-code-change-report.md",
    "docs/session-code-change-report.docx",
    "dist/install-manifest.json",
)

SEMVER_RE = re.compile(r"^(\d+)\.(\d+)\.(\d+)$")


class ReleaseError(RuntimeError):
    pass


@dataclass(frozen=True)
class ReleasePlan:
    current_version: str
    next_version: str
    build_number: int
    bump_type: str
    release_date: str
    codename: str
    branch: str
    previous_tag: str | None
    release_tag: str
    release_title: str
    release_notes: str
    release_notes_file: Path
    summary: str = ""          # short "power note" shown on the tag + release page
    changelog_entry: str = ""  # full categorized section prepended to CHANGES.md


def info(message: str) -> None:
    print(f"  [INFO] {message}")


def warn(message: str) -> None:
    print(f"  [WARN] {message}")


def ok(message: str) -> None:
    print(f"  [OK] {message}")


def _run(
    cmd: list[str],
    *,
    cwd: Path | None = None,
    check: bool = True,
    capture_output: bool = True,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd,
        cwd=cwd or ROOT,
        encoding="utf-8",
        errors="replace",
        text=True,
        capture_output=capture_output,
        check=check,
    )


def _require_tool(name: str) -> None:
    if shutil.which(name):
        return
    raise ReleaseError(f"Required tool '{name}' was not found in PATH.")


def _read_text(path: Path) -> str:
    if not path.exists():
        raise ReleaseError(f"Required file is missing: {path}")
    return path.read_text(encoding="utf-8")


def _write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(_read_text(path))
    except json.JSONDecodeError as exc:
        raise ReleaseError(f"Invalid JSON in {path}: {exc}") from exc


def _parse_semver(value: str, source: str) -> tuple[int, int, int]:
    match = SEMVER_RE.match(value.strip())
    if not match:
        raise ReleaseError(f"Expected semantic version in {source}, found '{value}'.")
    return tuple(int(part) for part in match.groups())


def _format_semver(parts: tuple[int, int, int]) -> str:
    return ".".join(str(part) for part in parts)


def _replace_regex(content: str, pattern: str, replacement: str, source: Path) -> str:
    updated, count = re.subn(pattern, replacement, content, count=1, flags=re.MULTILINE)
    if count != 1:
        raise ReleaseError(f"Could not update expected content in {source}.")
    return updated


def _git_output(*args: str, check: bool = True) -> str:
    result = _run(["git", *args], check=check)
    return result.stdout.strip()


def _check_gh_auth() -> None:
    result = _run(["gh", "auth", "status"], check=False)
    if result.returncode != 0:
        stderr = result.stderr.strip() or result.stdout.strip() or "GitHub CLI is not authenticated."
        raise ReleaseError(stderr)


def _current_branch() -> str:
    branch = _git_output("rev-parse", "--abbrev-ref", "HEAD")
    if not branch:
        raise ReleaseError("Could not determine the current git branch.")
    return branch


def _working_tree_status() -> str:
    result = _run(["git", "status", "--short"], check=False)
    return result.stdout.rstrip("\n")


def _filter_release_status_lines(status_output: str) -> tuple[list[str], list[str]]:
    ignored: list[str] = []
    relevant: list[str] = []
    for raw_line in status_output.splitlines():
        line = raw_line.rstrip()
        if not line:
            continue
        path_text = line[3:] if len(line) > 3 else line
        if " -> " in path_text:
            path_text = path_text.split(" -> ", 1)[1]
        normalized = path_text.replace("\\", "/")
        if normalized.startswith(IGNORED_DIRTY_PREFIXES):
            ignored.append(line)
            continue
        relevant.append(line)
    return relevant, ignored


def _latest_tag() -> str | None:
    result = _run(["git", "describe", "--tags", "--abbrev=0"], check=False)
    tag = result.stdout.strip()
    return tag or None


def _collect_declared_versions() -> dict[str, str]:
    versions: dict[str, str] = {}
    versions[str(VERSION_FILE.relative_to(ROOT))] = _read_text(VERSION_FILE).strip()

    version_json = _read_json(VERSION_JSON_FILE)
    versions[str(VERSION_JSON_FILE.relative_to(ROOT))] = str(version_json.get("version", "")).strip()

    frontend_package = _read_json(FRONTEND_PACKAGE_FILE)
    versions[str(FRONTEND_PACKAGE_FILE.relative_to(ROOT))] = str(frontend_package.get("version", "")).strip()

    frontend_app = _read_json(FRONTEND_APP_FILE)
    versions[str(FRONTEND_APP_FILE.relative_to(ROOT))] = str(frontend_app.get("expo", {}).get("version", "")).strip()

    readme = _read_text(README_FILE)
    match = re.search(r"\*\*Version:\*\* `([^`]+)`", readme)
    if not match:
        raise ReleaseError(f"Could not locate the version banner in {README_FILE}.")
    versions[str(README_FILE.relative_to(ROOT))] = match.group(1).strip()
    return versions


def _resolve_current_version() -> tuple[str, int]:
    versions = _collect_declared_versions()
    parsed: list[tuple[tuple[int, int, int], str]] = []
    for source, value in versions.items():
        parsed.append((_parse_semver(value, source), source))

    parsed.sort(key=lambda item: item[0], reverse=True)
    resolved_parts = parsed[0][0]
    resolved_version = _format_semver(resolved_parts)

    mismatches = [f"{source}={value}" for source, value in versions.items() if value != resolved_version]
    if mismatches:
        warn("Version drift detected. The release workflow will normalize all version files.")
        for mismatch in mismatches:
            warn(f"  {mismatch}")
        info(f"Using the highest declared version as the current release baseline: {resolved_version}")

    version_json = _read_json(VERSION_JSON_FILE)
    build_raw = str(version_json.get("build", "0")).strip() or "0"
    if not build_raw.isdigit():
        raise ReleaseError(f"Expected numeric build value in {VERSION_JSON_FILE}, found '{build_raw}'.")
    return resolved_version, int(build_raw)


def _bump_version(current_version: str, bump_type: str) -> str:
    major, minor, patch = _parse_semver(current_version, "resolved version")
    if bump_type == "major":
        return f"{major + 1}.0.0"
    if bump_type == "minor":
        return f"{major}.{minor + 1}.0"
    if bump_type == "patch":
        return f"{major}.{minor}.{patch + 1}"
    raise ReleaseError(f"Unsupported bump type '{bump_type}'.")


def _release_codename(bump_type: str, version: str) -> str:
    label = {"major": "Major", "minor": "Minor", "patch": "Patch"}.get(bump_type, "Minor")
    return f"{label} Release {version}"


def _update_root_version_files(plan: ReleasePlan) -> list[Path]:
    changed: list[Path] = []

    _write_text(VERSION_FILE, f"{plan.next_version}\n")
    changed.append(VERSION_FILE)

    version_json = _read_json(VERSION_JSON_FILE)
    version_json["version"] = plan.next_version
    version_json["build"] = str(plan.build_number)
    version_json["release_date"] = plan.release_date
    version_json["codename"] = plan.codename
    _write_text(VERSION_JSON_FILE, json.dumps(version_json, indent=2) + "\n")
    changed.append(VERSION_JSON_FILE)

    readme = _read_text(README_FILE)
    readme = _replace_regex(
        readme,
        r"(\*\*Version:\*\* `)([^`]+)(`)",
        rf"\g<1>{plan.next_version}\g<3>",
        README_FILE,
    )
    readme = _replace_regex(
        readme,
        r"(app\.json\s+# Expo config \(slug: roadready, v)(\d+\.\d+\.\d+)(\))",
        rf"\g<1>{plan.next_version}\g<3>",
        README_FILE,
    )
    _write_text(README_FILE, readme)
    changed.append(README_FILE)

    return changed


def _update_frontend_version_files(plan: ReleasePlan) -> list[Path]:
    changed: list[Path] = []

    frontend_package = _read_json(FRONTEND_PACKAGE_FILE)
    frontend_package["version"] = plan.next_version
    _write_text(FRONTEND_PACKAGE_FILE, json.dumps(frontend_package, indent=2) + "\n")
    changed.append(FRONTEND_PACKAGE_FILE)

    frontend_app = _read_json(FRONTEND_APP_FILE)
    expo_config = frontend_app.setdefault("expo", {})
    expo_config["version"] = plan.next_version
    _write_text(FRONTEND_APP_FILE, json.dumps(frontend_app, indent=2) + "\n")
    changed.append(FRONTEND_APP_FILE)

    return changed


def _update_backend_version_files(plan: ReleasePlan) -> list[Path]:
    changed: list[Path] = []

    setup_py = _read_text(BACKEND_SETUP_FILE)
    setup_py = _replace_regex(
        setup_py,
        r'return "\d+\.\d+\.\d+"',
        f'return "{plan.next_version}"',
        BACKEND_SETUP_FILE,
    )
    _write_text(BACKEND_SETUP_FILE, setup_py)
    changed.append(BACKEND_SETUP_FILE)

    backend_spec = _read_text(BACKEND_SPEC_FILE)
    backend_spec = _replace_regex(
        backend_spec,
        r"VERSION = '\d+\.\d+\.\d+'",
        f"VERSION = '{plan.next_version}'",
        BACKEND_SPEC_FILE,
    )
    _write_text(BACKEND_SPEC_FILE, backend_spec)
    changed.append(BACKEND_SPEC_FILE)

    version_tuple = ", ".join(plan.next_version.split(".") + [str(plan.build_number)])
    file_version = f"{plan.next_version}.{plan.build_number}"
    file_version_info = _read_text(BACKEND_FILE_VERSION_FILE)
    file_version_info = _replace_regex(
        file_version_info,
        r"filevers=\(\d+, \d+, \d+, \d+\)",
        f"filevers=({version_tuple})",
        BACKEND_FILE_VERSION_FILE,
    )
    file_version_info = _replace_regex(
        file_version_info,
        r"prodvers=\(\d+, \d+, \d+, \d+\)",
        f"prodvers=({version_tuple})",
        BACKEND_FILE_VERSION_FILE,
    )
    file_version_info = _replace_regex(
        file_version_info,
        r"StringStruct\(u'FileVersion', u'\d+\.\d+\.\d+\.\d+'\)",
        f"StringStruct(u'FileVersion', u'{file_version}')",
        BACKEND_FILE_VERSION_FILE,
    )
    file_version_info = _replace_regex(
        file_version_info,
        r"StringStruct\(u'ProductVersion', u'\d+\.\d+\.\d+\.\d+'\)",
        f"StringStruct(u'ProductVersion', u'{file_version}')",
        BACKEND_FILE_VERSION_FILE,
    )
    _write_text(BACKEND_FILE_VERSION_FILE, file_version_info)
    changed.append(BACKEND_FILE_VERSION_FILE)

    return changed


def _update_version_files(plan: ReleasePlan) -> list[Path]:
    changed: list[Path] = []
    changed.extend(_update_root_version_files(plan))
    changed.extend(_update_frontend_version_files(plan))
    changed.extend(_update_backend_version_files(plan))
    return changed


def _refresh_docs(plan: ReleasePlan) -> list[Path]:
    changed: list[Path] = []
    _write_text(INSTALL_GUIDE_FILE, install_guide(plan.next_version))
    changed.append(INSTALL_GUIDE_FILE)
    _write_text(UPDATE_GUIDE_FILE, update_guide(plan.next_version, plan.release_tag))
    changed.append(UPDATE_GUIDE_FILE)
    _write_text(RELEASE_WORKFLOW_FILE, release_workflow_guide())
    changed.append(RELEASE_WORKFLOW_FILE)
    return changed


def _release_commit_lines(previous_tag: str | None) -> list[str]:
    """All commit subjects since the previous release tag (no cap)."""
    if previous_tag:
        revision_range = f"{previous_tag}..HEAD"
    else:
        revision_range = "HEAD"
    result = _run([
        "git",
        "log",
        revision_range,
        "--pretty=format:%s",
    ], check=False)
    lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    return lines


# Conventional-commit prefix → changelog section (order = display order)
_COMMIT_CATEGORIES: list[tuple[tuple[str, ...], str]] = [
    (("feat", "feature"), "New Features"),
    (("fix", "bugfix", "hotfix"), "Bug Fixes"),
    (("perf",), "Performance"),
    (("refactor",), "Refactoring"),
    (("docs", "doc"), "Documentation"),
    (("test", "tests"), "Tests"),
    (("chore", "build", "ci", "style"), "Maintenance & Tooling"),
]
_PREFIX_RE = re.compile(r"^(\w+)(\([^)]*\))?!?:\s*")


def _categorize_commits(commits: list[str]) -> dict[str, list[str]]:
    """Group commit subjects by conventional-commit prefix; skip release commits."""
    sections: dict[str, list[str]] = {}
    for subject in commits:
        match = _PREFIX_RE.match(subject)
        prefix = match.group(1).lower() if match else ""
        if prefix == "release":
            continue  # previous release bookkeeping, not an improvement
        category = "Other Improvements"
        for prefixes, name in _COMMIT_CATEGORIES:
            if prefix in prefixes:
                category = name
                break
        sections.setdefault(category, []).append(subject)
    return sections


def _change_stats(previous_tag: str | None) -> dict[str, Any]:
    """Scan the code changes since the previous tag: totals + per-area breakdown."""
    if previous_tag:
        diff_base = previous_tag
        revision_range = f"{previous_tag}..HEAD"
    else:
        roots = _run(["git", "rev-list", "--max-parents=0", "HEAD"], check=False).stdout.split()
        diff_base = roots[0] if roots else "HEAD"
        revision_range = "HEAD"

    shortstat = _run(
        ["git", "diff", "--shortstat", diff_base, "HEAD"], check=False
    ).stdout.strip()

    files_out = _run(
        ["git", "diff", "--name-only", diff_base, "HEAD"], check=False
    ).stdout.splitlines()
    files = sorted({f.strip() for f in files_out if f.strip()})

    areas: dict[str, int] = {}
    for path in files:
        top = path.split("/")[0] if "/" in path else "(root)"
        areas[top] = areas.get(top, 0) + 1

    count_out = _run(["git", "rev-list", "--count", revision_range], check=False).stdout.strip()
    commit_count = int(count_out) if count_out.isdigit() else 0

    return {
        "shortstat": shortstat or "no file changes detected",
        "files_changed": len(files),
        "areas": areas,
        "commit_count": commit_count,
    }


def _build_summary(plan_tag: str, sections: dict[str, list[str]], stats: dict[str, Any]) -> str:
    """One-paragraph 'power note' for the tag message and release page."""
    counts = []
    short_labels = {
        "New Features": "new feature",
        "Bug Fixes": "fix",
        "Performance": "performance improvement",
        "Refactoring": "refactor",
        "Documentation": "documentation update",
        "Tests": "test improvement",
        "Maintenance & Tooling": "maintenance update",
        "Other Improvements": "other improvement",
    }
    for name, items in sections.items():
        label = short_labels.get(name, name.lower())
        plural_label = "fixes" if label == "fix" else f"{label}s"
        counts.append(f"{len(items)} {label if len(items) == 1 else plural_label}")
    counts_text = ", ".join(counts) if counts else "version maintenance only"

    highlight = ""
    for source in ("New Features", "Performance", "Bug Fixes", "Other Improvements"):
        if sections.get(source):
            first = _PREFIX_RE.sub("", sections[source][0])
            highlight = f" Top highlight: {first}."
            break

    ins = re.search(r"(\d+) insertion", stats["shortstat"])
    dels = re.search(r"(\d+) deletion", stats["shortstat"])
    delta = ""
    if ins or dels:
        delta = f" (+{ins.group(1) if ins else 0}/-{dels.group(1) if dels else 0} lines)"

    return (
        f"Drive Alive {plan_tag} — {counts_text} across "
        f"{stats['files_changed']} files{delta}.{highlight} "
        f"Full details in CHANGES.md."
    )


def _changelog_entry(plan: ReleasePlan, sections: dict[str, list[str]], stats: dict[str, Any]) -> str:
    """Full categorized changelog section for this release (goes into CHANGES.md)."""
    lines = [
        f"## {plan.release_tag} — {plan.release_date} ({plan.codename})",
        "",
        f"> {plan.summary}" if plan.summary else "",
        "",
    ]
    ordered_names = [name for _, name in _COMMIT_CATEGORIES] + ["Other Improvements"]
    for name in ordered_names:
        items = sections.get(name)
        if not items:
            continue
        lines.append(f"### {name}")
        lines.extend(f"- {subject}" for subject in items)
        lines.append("")

    area_text = ", ".join(f"{area}: {count}" for area, count in sorted(stats["areas"].items(), key=lambda kv: -kv[1]))
    lines.append(
        f"**Scope:** {stats['commit_count']} commits, {stats['shortstat']}"
        + (f" — touched: {area_text}" if area_text else "")
    )
    lines.append("")
    return "\n".join(line for line in lines if line is not None)


def _update_changelog(entry: str) -> Path:
    """Prepend this release's entry to CHANGES.md (created on first release)."""
    header = (
        "# Drive Alive — Changelog\n\n"
        "All code improvements per release, newest first. Generated automatically\n"
        "by the release workflow (`s.bat minor` / `s.bat major` / `s.bat release`).\n\n"
    )
    if CHANGES_FILE.exists():
        existing = _read_text(CHANGES_FILE)
        body = existing.split("\n## ", 1)
        previous_entries = ("## " + body[1]) if len(body) == 2 else ""
        content = header + entry + "\n" + previous_entries
    else:
        content = header + entry + "\n"
    _write_text(CHANGES_FILE, content)
    return CHANGES_FILE


def _release_notes(
    plan: ReleasePlan,
    sections: dict[str, list[str]],
    stats: dict[str, Any],
    summary: str,
) -> str:
    previous_tag_line = plan.previous_tag or "No previous tag"

    change_lines: list[str] = []
    ordered_names = [name for _, name in _COMMIT_CATEGORIES] + ["Other Improvements"]
    for name in ordered_names:
        items = sections.get(name)
        if not items:
            continue
        change_lines.append(f"### {name}")
        change_lines.extend(f"- {subject}" for subject in items)
        change_lines.append("")
    change_section = "\n".join(change_lines).strip() or "- Version maintenance only."

    parts = [
        f"# {plan.release_title}",
        "",
        f"> {summary}",
        "",
        "## Release Summary",
        "",
        f"- Previous tag: {previous_tag_line}",
        f"- Current baseline: {plan.current_version}",
        f"- Published version: {plan.next_version}",
        f"- Release date: {plan.release_date}",
        f"- Codename: {plan.codename}",
        f"- Scope: {stats['commit_count']} commits, {stats['shortstat']}",
        "",
        "## Included Changes",
        "",
        change_section,
        "",
        "Full historical changelog: `CHANGES.md`",
        "",
        "## Installation And Upgrade",
        "",
        "- New PC installation guide: `docs/INSTALL_WINDOWS.md`",
        "- Upgrade guide: `docs/UPDATE_WINDOWS.md`",
        "- Release workflow reference: `docs/RELEASE_WORKFLOW.md`",
        "",
        "## Database And Setup Notes",
        "",
        "- Review `backend/.env.example` before first run.",
        "- Run `alembic upgrade head` if your environment requires an explicit migration step.",
        "- Verify PostgreSQL is installed and available before running `s.bat install`.",
    ]
    return "\n".join(parts) + "\n"


def _write_release_artifacts(plan: ReleasePlan) -> list[Path]:
    changed: list[Path] = []
    runtime_versions = _read_json(VERSION_JSON_FILE).get("runtimes", {})
    RELEASES_DIR.mkdir(parents=True, exist_ok=True)
    _write_text(plan.release_notes_file, plan.release_notes)
    changed.append(plan.release_notes_file)

    if plan.changelog_entry:
        changed.append(_update_changelog(plan.changelog_entry))

    DIST_DIR.mkdir(parents=True, exist_ok=True)
    install_manifest = {
        "version": plan.next_version,
        "build": str(plan.build_number),
        "release_date": plan.release_date,
        "codename": plan.codename,
        "components": {
            "runtime_versions": runtime_versions,
            "backend_executable": "backend/drive-alive-api.exe",
            "backend_source": "backend/app",
            "frontend_web": "frontend/index.html",
            "bootstrap": "bootstrap.py",
            "python_requirements": "backend/requirements.txt",
            "frontend_manifest": "frontend/package.json",
            "frontend_lockfile": "frontend/package-lock.json",
            "offline_python_packages": "vendor/python",
            "offline_node_modules": "vendor/node/node_modules.tar.gz",
            "system_installers": [
                "vendor/installers/python-installer.exe",
                "vendor/installers/postgresql-installer.exe",
                "vendor/installers/node-installer.msi",
            ],
        },
        "install_guide": str(INSTALL_GUIDE_FILE.relative_to(ROOT)).replace("\\", "/"),
        "update_guide": str(UPDATE_GUIDE_FILE.relative_to(ROOT)).replace("\\", "/"),
        "release_notes": str(plan.release_notes_file.relative_to(ROOT)).replace("\\", "/"),
        "installer_definition": str(INSTALLER_FILE.relative_to(ROOT)).replace("\\", "/"),
        "installer_asset": f"dist/DriveAlive-Setup-{plan.next_version}.exe",
    }
    _write_text(INSTALL_MANIFEST_FILE, json.dumps(install_manifest, indent=2) + "\n")
    changed.append(INSTALL_MANIFEST_FILE)
    return changed


def _validate_versions(expected_version: str) -> None:
    versions = _collect_declared_versions()
    mismatches = [f"{source}={value}" for source, value in versions.items() if value != expected_version]
    if mismatches:
        raise ReleaseError(
            "Version synchronization failed. Mismatched files: " + ", ".join(mismatches)
        )


def _validate_worktree(dry_run: bool) -> None:
    status = _working_tree_status()
    relevant_status, ignored_status = _filter_release_status_lines(status)
    if ignored_status:
        warn("Ignoring generated local artifacts during release validation:")
        for line in ignored_status:
            warn(f"  {line}")
    if relevant_status and not dry_run:
        raise ReleaseError(
            "Release aborted because the git working tree is not clean:\n" + "\n".join(relevant_status)
        )
    if relevant_status and dry_run:
        warn("Dry-run continuing with a dirty worktree. A real release would fail until it is clean.")


def _validate_no_secrets(dry_run: bool) -> None:
    """
    Refuse to publish a release carrying credentials or user records.

    The pre-commit hook is the first line of defence, but it can be bypassed
    with --no-verify and it never runs on commits made before it existed.
    This is the last gate before code becomes public, so it scans the whole
    tracked tree rather than just a diff.
    """
    scanner = ROOT / "scripts" / "secret_scan.py"
    if not scanner.exists():
        warn("secret_scan.py is missing — skipping the credential scan.")
        return

    result = subprocess.run(
        [sys.executable, str(scanner), "--tracked", "--quiet"],
        capture_output=True, text=True, cwd=ROOT, errors="replace",
    )
    if result.returncode == 0:
        ok("Credential scan clean.")
        return

    report = (result.stderr or result.stdout).strip()
    if result.returncode == 2:
        warn(f"Credential scan could not run:\n{report}")
        return

    if dry_run:
        warn("Dry-run continuing despite credential findings. A real release would abort:")
        warn(report)
        return
    raise ReleaseError(
        "Release aborted — credentials or personal data found in tracked files:\n" + report
    )


def _preflight(dry_run: bool) -> tuple[str, str | None]:
    _require_tool("git")
    branch = _current_branch()
    if branch != "main":
        raise ReleaseError(f"Releases must be cut from the main branch. Current branch: {branch}")

    _validate_worktree(dry_run=dry_run)
    _validate_no_secrets(dry_run=dry_run)

    previous_tag = _latest_tag()
    if not dry_run:
        _require_tool("gh")
        _check_gh_auth()
    return branch, previous_tag


def _build_plan(bump_type: str, branch: str, previous_tag: str | None) -> ReleasePlan:
    current_version, current_build = _resolve_current_version()
    next_version = _bump_version(current_version, bump_type)
    release_date_value = date.today().isoformat()
    build_number = current_build + 1
    release_tag = f"v{next_version}"
    release_title = f"Drive Alive {release_tag}"
    codename = _release_codename(bump_type, next_version)
    commits = _release_commit_lines(previous_tag)
    sections = _categorize_commits(commits)
    stats = _change_stats(previous_tag)
    summary = _build_summary(release_tag, sections, stats)
    notes_file = RELEASES_DIR / f"{release_tag}.md"
    temp_plan = ReleasePlan(
        current_version=current_version,
        next_version=next_version,
        build_number=build_number,
        bump_type=bump_type,
        release_date=release_date_value,
        codename=codename,
        branch=branch,
        previous_tag=previous_tag,
        release_tag=release_tag,
        release_title=release_title,
        release_notes="",
        release_notes_file=notes_file,
        summary=summary,
    )
    notes = _release_notes(temp_plan, sections, stats, summary)
    changelog_entry = _changelog_entry(temp_plan, sections, stats)
    return ReleasePlan(
        current_version=current_version,
        next_version=next_version,
        build_number=build_number,
        bump_type=bump_type,
        release_date=release_date_value,
        codename=codename,
        branch=branch,
        previous_tag=previous_tag,
        release_tag=release_tag,
        release_title=release_title,
        release_notes=notes,
        release_notes_file=notes_file,
        summary=summary,
        changelog_entry=changelog_entry,
    )


def _commit_release(plan: ReleasePlan) -> None:
    _run(["git", "commit", "-m", f"release: {plan.release_tag}"])


def _tag_release(plan: ReleasePlan) -> None:
    existing_tag = _run(["git", "tag", "--list", plan.release_tag], check=False)
    if existing_tag.stdout.strip():
        raise ReleaseError(f"Tag {plan.release_tag} already exists.")
    # Annotated tag carries the power note so the tag page summarizes the release
    tag_message = f"{plan.release_title}\n\n{plan.summary}" if plan.summary else f"Release {plan.release_tag}"
    _run(["git", "tag", "-a", plan.release_tag, "-m", tag_message])


def _push_release(plan: ReleasePlan) -> None:
    _run(["git", "push", "origin", plan.branch])
    _run(["git", "push", "origin", plan.release_tag])


def _publish_release(plan: ReleasePlan, installer_asset: Path) -> None:
    release_assets = [str(installer_asset)]
    if SESSION_REPORT_DOCX.exists():
        release_assets.append(str(SESSION_REPORT_DOCX))

    _run([
        "gh",
        "release",
        "create",
        plan.release_tag,
        *release_assets,
        "--title",
        plan.release_title,
        "--notes-file",
        str(plan.release_notes_file),
    ])


def execute_release(bump_type: str, dry_run: bool = False) -> None:
    branch, previous_tag = _preflight(dry_run=dry_run)
    plan = _build_plan(bump_type=bump_type, branch=branch, previous_tag=previous_tag)

    info(f"Current version: {plan.current_version}")
    info(f"Next version   : {plan.next_version}")
    info(f"Build number   : {plan.build_number}")
    info(f"Release tag    : {plan.release_tag}")

    tracked_changes = [
        VERSION_FILE,
        VERSION_JSON_FILE,
        FRONTEND_PACKAGE_FILE,
        FRONTEND_APP_FILE,
        README_FILE,
        BACKEND_SETUP_FILE,
        BACKEND_SPEC_FILE,
        BACKEND_FILE_VERSION_FILE,
        INSTALL_GUIDE_FILE,
        UPDATE_GUIDE_FILE,
        RELEASE_WORKFLOW_FILE,
        plan.release_notes_file,
        CHANGES_FILE,
        INSTALL_MANIFEST_FILE,
    ]

    info(f"Summary (tag + release page): {plan.summary}")

    if dry_run:
        info("Dry-run mode enabled. Planned file updates:")
        for path in tracked_changes:
            info(f"  - {path.relative_to(ROOT)}")
        if plan.changelog_entry:
            info("Planned CHANGES.md entry:")
            for line in plan.changelog_entry.splitlines():
                print(f"      {line}")
        info("Dry-run mode planned build steps:")
        for step in ("python bootstrap.py --bundle", "npm --prefix frontend run build:web", "backend\\venv\\Scripts\\python.exe -m PyInstaller drive-alive.spec --clean", "ISCC scripts\\installer.iss"):
            info(f"  - {step}")
        info(f"  - Output installer: dist\\DriveAlive-Setup-{plan.next_version}.exe")
        return

    changed_paths: list[Path] = []
    changed_paths.extend(_update_version_files(plan))
    changed_paths.extend(_refresh_docs(plan))
    changed_paths.extend(_write_release_artifacts(plan))
    _validate_versions(plan.next_version)
    try:
        installer_asset = build_release_installer(
            root=ROOT,
            backend_dir=BACKEND_DIR,
            frontend_dir=FRONTEND_DIR,
            installer_file=INSTALLER_FILE,
            version=plan.next_version,
            info=info,
            ok=ok,
        )
    except RuntimeError as exc:
        raise ReleaseError(str(exc)) from exc

    try:
        stage_paths(ROOT, changed_paths)
    except RuntimeError as exc:
        raise ReleaseError(f"Failed to stage release files: {exc}") from exc
    _commit_release(plan)
    _tag_release(plan)
    _push_release(plan)
    _publish_release(plan, installer_asset)
    ok(f"Release {plan.release_tag} published successfully.")
