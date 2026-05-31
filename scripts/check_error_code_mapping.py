#!/usr/bin/env python3
"""Fail if backend user-facing error codes are not mapped in frontend i18n."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_ROOT = REPO_ROOT / "backend" / "app"
MAPPING_PATH = REPO_ROOT / "frontend" / "i18n" / "error-code-map.json"

# Accepts patterns like: detail={"code": "AUTH_INVALID"} or error_code="AUTH_INVALID"
CODE_PATTERN = re.compile(
    r"(?:['\"]code['\"]\s*[:=]\s*['\"]([A-Z0-9_.-]+)['\"]|"
    r"error_code\s*=\s*['\"]([A-Z0-9_.-]+)['\"])",
)


def collect_backend_codes() -> list[str]:
    if not BACKEND_ROOT.exists():
        print(f"Backend path not found: {BACKEND_ROOT}")
        return []

    codes: set[str] = set()
    for py_file in BACKEND_ROOT.rglob("*.py"):
        text = py_file.read_text(encoding="utf-8", errors="ignore")
        for match in CODE_PATTERN.finditer(text):
            code = match.group(1) or match.group(2)
            if code:
                codes.add(code)

    return sorted(codes)


def load_mapping() -> dict[str, str] | None:
    if not MAPPING_PATH.exists():
        print(f"Missing mapping file: {MAPPING_PATH}")
        print("Create a JSON object where keys are backend error codes and values are i18n keys.")
        return None

    try:
        data = json.loads(MAPPING_PATH.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to parse mapping file: {exc}")
        return None

    if not isinstance(data, dict):
        print("Mapping file must be a JSON object.")
        return None

    normalized: dict[str, str] = {}
    for key, value in data.items():
        if isinstance(key, str):
            normalized[key] = value if isinstance(value, str) else ""
    return normalized


def main() -> int:
    backend_codes = collect_backend_codes()

    if not backend_codes:
        print("No backend error codes found.")
        print("Add stable error codes in backend user-facing error payloads before enabling this gate.")
        return 1

    mapping = load_mapping()
    if mapping is None:
        return 1

    missing = [code for code in backend_codes if code not in mapping]
    empty = [code for code, i18n_key in mapping.items() if not i18n_key.strip()]

    if missing:
        print("Missing frontend mappings for backend error code(s):")
        for code in missing:
            print(f"  - {code}")

    if empty:
        print("Invalid mapping entries with empty i18n key:")
        for code in empty:
            print(f"  - {code}")

    if missing or empty:
        return 1

    print(f"Error code mapping check passed. Covered backend code count: {len(backend_codes)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
