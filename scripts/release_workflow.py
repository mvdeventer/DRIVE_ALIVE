from __future__ import annotations

import json
import re
import shutil
import subprocess
import textwrap
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

from release_templates import install_guide, release_workflow_guide, update_guide

ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"
DOCS_DIR = ROOT / "docs"
RELEASES_DIR = DOCS_DIR / "releases"
DIST_DIR = ROOT / "dist"

VERSION_FILE = ROOT / "VERSION"
VERSION_JSON_FILE = ROOT / "version.json"
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
INSTALL_MANIFEST_FILE = DIST_DIR / "install-manifest.json"

IGNORED_DIRTY_PREFIXES = (
    "backend/.backend.pid",
    "frontend/.frontend.pid",
    "backend/backups/",
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
    return _git_output("status", "--short", check=False)


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
    major, minor, _patch = _parse_semver(current_version, "resolved version")
    if bump_type == "major":
        return f"{major + 1}.0.0"
    if bump_type == "minor":
        return f"{major}.{minor + 1}.0"
    raise ReleaseError(f"Unsupported bump type '{bump_type}'.")


def _release_codename(bump_type: str, version: str) -> str:
    label = "Major" if bump_type == "major" else "Minor"
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
    if previous_tag:
        revision_range = f"{previous_tag}..HEAD"
    else:
        revision_range = "HEAD"
    result = _run([
        "git",
        "log",
        revision_range,
        "--pretty=format:%s",
        "--max-count",
        "25",
    ], check=False)
    lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    return lines


def _release_notes(plan: ReleasePlan, commits: list[str]) -> str:
    commit_section = "\n".join(f"- {line}" for line in commits) if commits else "- No commit subjects were found in the selected release range."
    previous_tag_line = plan.previous_tag or "No previous tag"
    return textwrap.dedent(
        f"""
        # {plan.release_title}

        ## Release Summary

        - Previous tag: {previous_tag_line}
        - Current baseline: {plan.current_version}
        - Published version: {plan.next_version}
        - Release date: {plan.release_date}
        - Codename: {plan.codename}

        ## Installation And Upgrade

        - New PC installation guide: `docs/INSTALL_WINDOWS.md`
        - Upgrade guide: `docs/UPDATE_WINDOWS.md`
        - Release workflow reference: `docs/RELEASE_WORKFLOW.md`

        ## Database And Setup Notes

        - Review `backend/.env.example` before first run.
        - Run `alembic upgrade head` if your environment requires an explicit migration step.
        - Verify PostgreSQL is installed and available before running `s.bat install`.

        ## Included Changes

        {commit_section}
        """
    ).strip() + "\n"


def _write_release_artifacts(plan: ReleasePlan) -> list[Path]:
    changed: list[Path] = []
    RELEASES_DIR.mkdir(parents=True, exist_ok=True)
    _write_text(plan.release_notes_file, plan.release_notes)
    changed.append(plan.release_notes_file)

    DIST_DIR.mkdir(parents=True, exist_ok=True)
    install_manifest = {
        "version": plan.next_version,
        "build": str(plan.build_number),
        "release_date": plan.release_date,
        "codename": plan.codename,
        "install_guide": str(INSTALL_GUIDE_FILE.relative_to(ROOT)).replace("\\", "/"),
        "update_guide": str(UPDATE_GUIDE_FILE.relative_to(ROOT)).replace("\\", "/"),
        "release_notes": str(plan.release_notes_file.relative_to(ROOT)).replace("\\", "/"),
        "installer_definition": str(INSTALLER_FILE.relative_to(ROOT)).replace("\\", "/"),
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


def _preflight(dry_run: bool) -> tuple[str, str | None]:
    _require_tool("git")
    branch = _current_branch()
    if branch != "main":
        raise ReleaseError(f"Releases must be cut from the main branch. Current branch: {branch}")

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
    )
    notes = _release_notes(temp_plan, commits)
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
    )


def _stage_paths(paths: list[Path]) -> None:
    relative_paths = [str(path.relative_to(ROOT)) for path in paths]
    _run(["git", "add", *relative_paths])


def _commit_release(plan: ReleasePlan) -> None:
    _run(["git", "commit", "-m", f"release: {plan.release_tag}"])


def _tag_release(plan: ReleasePlan) -> None:
    existing_tag = _run(["git", "tag", "--list", plan.release_tag], check=False)
    if existing_tag.stdout.strip():
        raise ReleaseError(f"Tag {plan.release_tag} already exists.")
    _run(["git", "tag", "-a", plan.release_tag, "-m", f"Release {plan.release_tag}"])


def _push_release(plan: ReleasePlan) -> None:
    _run(["git", "push", "origin", plan.branch])
    _run(["git", "push", "origin", plan.release_tag])


def _publish_release(plan: ReleasePlan) -> None:
    _run([
        "gh",
        "release",
        "create",
        plan.release_tag,
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
        INSTALL_MANIFEST_FILE,
    ]

    if dry_run:
        info("Dry-run mode enabled. Planned file updates:")
        for path in tracked_changes:
            info(f"  - {path.relative_to(ROOT)}")
        return

    changed_paths: list[Path] = []
    changed_paths.extend(_update_version_files(plan))
    changed_paths.extend(_refresh_docs(plan))
    changed_paths.extend(_write_release_artifacts(plan))
    _validate_versions(plan.next_version)

    _stage_paths(changed_paths)
    _commit_release(plan)
    _tag_release(plan)
    _push_release(plan)
    _publish_release(plan)
    ok(f"Release {plan.release_tag} published successfully.")
