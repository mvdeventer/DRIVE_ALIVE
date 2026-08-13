#!/usr/bin/env bash
#
# WSL wrapper for s.bat
# =====================
# scripts/da.py is Windows-only by construction: it resolves the venv at
# venv\Scripts\python.exe, stops servers with taskkill, activates with
# activate.bat, and opens each server in its own Command Prompt window via
# PowerShell Start-Process. None of that has a Linux equivalent, so running it
# under the WSL interpreter fails in a dozen small ways rather than one obvious
# one. Hand the whole command to Windows instead and let it run natively.
#
#   ./s status          ./s start -b        ./s stop
#
# Add the repo root to PATH (or alias s=/mnt/c/Projects/DRIVE_ALIVE/s) to drop
# the leading "./".

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v wslpath >/dev/null 2>&1; then
  echo "s: not running under WSL — use s.bat directly from a Windows shell." >&2
  exit 1
fi

WIN_ROOT="$(wslpath -w "$ROOT")"

CMD_EXE="$(command -v cmd.exe || true)"
[ -n "$CMD_EXE" ] || CMD_EXE=/mnt/c/Windows/System32/cmd.exe
if [ ! -x "$CMD_EXE" ]; then
  echo "s: cannot find cmd.exe — is Windows interop enabled?" >&2
  exit 1
fi

# Child Python processes fall back to cp1252 when stdout is a pipe or file
# rather than a console, and die on the first non-ASCII character they print.
# Harmless when attached to a terminal; essential under `./s ... | tee log`.
exec "$CMD_EXE" /c "cd /d $WIN_ROOT && set PYTHONIOENCODING=utf-8 && s.bat $*"
