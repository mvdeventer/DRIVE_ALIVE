#!/usr/bin/env python3
"""
Credential and personal-data scanner for Drive Alive.

One scanner, two callers:

    python scripts/secret_scan.py --staged     # .githooks/pre-commit
    python scripts/secret_scan.py --tracked    # release preflight

Exit codes:  0 = clean, 1 = findings (caller should abort), 2 = scanner error.

Why this exists: `.gitignore` does not untrack files that are already
committed, and the previous hook only matched secrets in `KEY=value` form,
so a bare Twilio SID pasted into a markdown doc went straight through.
This scanner matches credential *shapes* wherever they appear, and treats
database dumps carrying `password_hash` as blocking findings in their own
right — those are POPIA-relevant personal data, not just secrets.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# This file necessarily contains the patterns it searches for, and the
# allowlist necessarily contains whatever was waived. Scanning either would
# be self-defeating; both are small and reviewed by hand.
SELF_EXCLUDED = {
    "scripts/secret_scan.py",
    ".secretsallow",
}

ALLOWLIST_FILE = ROOT / ".secretsallow"

# Text that marks a value as a placeholder rather than a live credential.
PLACEHOLDER_HINTS = (
    "your_", "your-", "yourkey", "example", "changeme", "change_me", "placeholder",
    "dummy", "sample", "redacted", "xxxx", "<", "...", "abc123", "insert_",
    "replace_", "todo", "fake", "notreal", "0000000000",
)

# (name, compiled pattern, human explanation)
SECRET_PATTERNS: list[tuple[str, re.Pattern[str], str]] = [
    (
        "twilio-account-sid",
        re.compile(r"\bAC[0-9a-fA-F]{32}\b"),
        "Twilio Account SID (matched anywhere, not just KEY=value)",
    ),
    (
        "twilio-api-key",
        re.compile(r"\bSK[0-9a-fA-F]{32}\b"),
        "Twilio API key SID",
    ),
    (
        "stripe-secret-key",
        re.compile(r"\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}"),
        "Stripe secret or restricted key",
    ),
    (
        "github-token",
        re.compile(r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{60,}\b"),
        "GitHub personal access token",
    ),
    (
        "aws-access-key",
        re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b"),
        "AWS access key ID",
    ),
    (
        "google-api-key",
        re.compile(r"\bAIza[0-9A-Za-z_\-]{35}\b"),
        "Google / Firebase API key",
    ),
    (
        "private-key-block",
        re.compile(r"-{5}BEGIN (?:RSA |EC |OPENSSH |PGP |DSA )?PRIVATE KEY-{5}"),
        "Private key block",
    ),
    (
        "gmail-app-password",
        # Google app passwords are 16 *lowercase* letters, usually pasted in
        # four groups. Only the key is case-insensitive — making the whole
        # pattern `(?i)` would match any 16 letters, e.g. `= EncryptionService`.
        # The value must also be a quoted literal: a bare identifier is code.
        re.compile(
            r"(?i:(?:smtp|mail|gmail|email)[_a-z]*(?:password|pass|pwd))\s*[:=]\s*"
            r"['\"]([a-z]{4} ?[a-z]{4} ?[a-z]{4} ?[a-z]{4})['\"]"
        ),
        "Gmail app password",
    ),
    (
        "bcrypt-hash",
        # A literal password hash is wrong in source and in a tracked dump
        # alike, and unlike the field name it cannot be a false positive.
        re.compile(r"\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}"),
        "Literal bcrypt password hash",
    ),
    (
        "assigned-secret",
        # Generic KEY=<long opaque value> — the old hook's job, kept.
        re.compile(
            r"(?i)\b(?:secret_key|jwt_secret|auth_token|api_key|access_token|"
            r"encryption_key|client_secret|db_password|database_password)\b"
            r"\s*[:=]\s*['\"]?([A-Za-z0-9+/_\-]{24,})['\"]?"
        ),
        "Secret assigned to a credential-named key",
    ),
]

# Paths that must never enter the index, regardless of content.
BLOCKED_PATH_PATTERNS: list[tuple[str, re.Pattern[str], str]] = [
    (
        "env-file",
        re.compile(r"(?:^|/)\.env(?:\.(?!example$|template$|sample$)[A-Za-z0-9_.-]+)?$"),
        "Environment file (real credentials live here)",
    ),
    (
        "backup-archive",
        re.compile(r"(?:^|/)backups?/.*\.(?:zip|tar|tar\.gz|tgz|7z|rar)$"),
        "Backup archive (these have shipped real user records before)",
    ),
    (
        "database-file",
        re.compile(r"\.(?:sqlite3?|db)$"),
        "Database file",
    ),
    (
        "database-dump",
        re.compile(r"(?:^|/)backups?/.*\.(?:json|sql|csv)$|\.(?:sql)$"),
        "Database dump",
    ),
]

# Personal data that must not be committed even in plain text.
#
# `password_hash` as a bare field name is ordinary source code — an ORM column,
# an attribute assignment, a test fixture. It only signals exported user
# records when it appears in a *data* file, so this rule is scoped to those
# paths. Actual hash values are caught everywhere by the `bcrypt-hash` rule.
PII_PATTERN = re.compile(r"[\"']password_hash[\"']\s*[:=]")
DATA_PATH_RE = re.compile(r"(?:^|/)backups?/|\.(?:sql|csv)$|dump", re.IGNORECASE)

TEXT_SUFFIXES = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".txt", ".yml", ".yaml",
    ".toml", ".ini", ".cfg", ".env", ".sh", ".ps1", ".bat", ".sql", ".csv",
    ".html", ".css", ".xml", ".spec", ".iss", ".gitignore", "",
}

MAX_SCAN_BYTES = 2_000_000


class Finding:
    def __init__(self, path: str, rule: str, explain: str, line: int | None = None, excerpt: str = ""):
        self.path = path
        self.rule = rule
        self.explain = explain
        self.line = line
        self.excerpt = excerpt

    def render(self) -> str:
        where = f"{self.path}:{self.line}" if self.line else self.path
        out = f"  [{self.rule}] {where}\n      {self.explain}"
        if self.excerpt:
            out += f"\n      > {self.excerpt}"
        return out


def _git(*args: str) -> str:
    result = subprocess.run(
        ["git", *args], capture_output=True, text=True, cwd=ROOT, errors="replace"
    )
    if result.returncode != 0 and not result.stdout:
        raise RuntimeError(f"git {' '.join(args)} failed: {result.stderr.strip()}")
    return result.stdout


def _load_allowlist() -> set[str]:
    """Waived findings, one `rule:path` per line. `#` comments allowed."""
    if not ALLOWLIST_FILE.exists():
        return set()
    entries = set()
    for raw in ALLOWLIST_FILE.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw.split("#", 1)[0].strip()
        if line:
            entries.add(line)
    return entries


def _is_placeholder(value: str) -> bool:
    low = value.lower()
    if any(hint in low for hint in PLACEHOLDER_HINTS):
        return True
    stripped = low.strip("'\"` ")
    if not stripped:
        return True
    # A run of one repeated character is never a real credential.
    return len(set(stripped)) <= 2


def _redact(text: str) -> str:
    """Never echo a live credential into a terminal or CI log."""
    snippet = text.strip()[:120]
    return re.sub(r"[A-Za-z0-9+/_\-]{8,}", lambda m: m.group(0)[:4] + "...redacted...", snippet)


def _scan_text(path: str, text: str, findings: list[Finding], line_offset_map=None) -> None:
    is_data_file = bool(DATA_PATH_RE.search(path))
    for idx, line in enumerate(text.splitlines(), start=1):
        lineno = line_offset_map(idx) if line_offset_map else idx
        for rule, pattern, explain in SECRET_PATTERNS:
            match = pattern.search(line)
            if not match:
                continue
            captured = match.group(1) if match.groups() else match.group(0)
            if _is_placeholder(captured):
                continue
            findings.append(Finding(path, rule, explain, lineno, _redact(match.group(0))))
        if is_data_file and PII_PATTERN.search(line):
            findings.append(
                Finding(
                    path,
                    "personal-data",
                    "Password hashes / user records - POPIA-relevant personal data",
                    lineno,
                    "password_hash field present",
                )
            )


def _check_paths(paths: list[str], findings: list[Finding]) -> None:
    for path in paths:
        for rule, pattern, explain in BLOCKED_PATH_PATTERNS:
            if pattern.search(path):
                findings.append(Finding(path, rule, explain))
                break


def _looks_scannable(path: str) -> bool:
    suffix = Path(path).suffix.lower()
    return suffix in TEXT_SUFFIXES


def scan_staged() -> list[Finding]:
    findings: list[Finding] = []
    names = [p for p in _git("diff", "--cached", "--name-only", "--diff-filter=ACM").splitlines() if p]
    names = [p for p in names if p not in SELF_EXCLUDED]

    _check_paths(names, findings)

    # Only added lines — existing content is someone else's problem to fix,
    # and flagging it would make every commit in a dirty area unlandable.
    diff = _git("diff", "--cached", "-U0", "--diff-filter=ACM")
    current = ""
    added: dict[str, list[str]] = {}
    for line in diff.splitlines():
        if line.startswith("+++ b/"):
            current = line[6:]
            continue
        if line.startswith("+") and not line.startswith("+++") and current:
            added.setdefault(current, []).append(line[1:])
    for path, lines in added.items():
        if path in SELF_EXCLUDED:
            continue
        _scan_text(path, "\n".join(lines), findings)
    return findings


def scan_tracked() -> list[Finding]:
    findings: list[Finding] = []
    names = [p for p in _git("ls-files").splitlines() if p and p not in SELF_EXCLUDED]

    _check_paths(names, findings)

    for path in names:
        if not _looks_scannable(path):
            continue
        full = ROOT / path
        try:
            if not full.is_file() or full.stat().st_size > MAX_SCAN_BYTES:
                continue
            text = full.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        _scan_text(path, text, findings)
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description="Scan for credentials and personal data.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--staged", action="store_true", help="Scan staged changes (pre-commit).")
    mode.add_argument("--tracked", action="store_true", help="Scan the whole tracked tree (release).")
    parser.add_argument("--quiet", action="store_true", help="Only print on findings.")
    args = parser.parse_args()

    try:
        findings = scan_staged() if args.staged else scan_tracked()
    except RuntimeError as exc:
        print(f"  [ERROR] secret scan could not run: {exc}", file=sys.stderr)
        return 2

    allowed = _load_allowlist()
    if allowed:
        findings = [f for f in findings if f"{f.rule}:{f.path}" not in allowed]

    scope = "staged changes" if args.staged else "tracked files"
    if not findings:
        if not args.quiet:
            print(f"  [OK] No credentials or personal data found in {scope}.")
        return 0

    print(f"\n  BLOCKED: {len(findings)} finding(s) in {scope}.\n", file=sys.stderr)
    for finding in findings:
        print(finding.render(), file=sys.stderr)
    print(
        "\n  Fix by removing the value and reading it from an environment variable,\n"
        "  or `git rm --cached <path>` for a file that should never be tracked.\n"
        "  A genuine false positive can be waived in .secretsallow as `rule:path`.\n"
        "  Rotate anything that was real - untracking does not unpublish it.\n",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
