#!/usr/bin/env bash
#
# Linux/WSL entry point for scripts/da.py
# =======================================
# The Windows equivalent is s.bat. Both hand off to the same scripts/da.py,
# which branches on os.name for venv layout, process control and how servers
# are launched (Command Prompt windows on Windows, detached process groups
# writing to logs/ here).
#
#   ./s status          ./s start -b        ./s stop
#
# Add the repo root to PATH (or alias s=~/projects/DRIVE_ALIVE/DRIVE_ALIVE/s) to
# drop the leading "./".

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# nvm is not on PATH in a non-interactive shell, and the Windows npm that WSL
# interop leaks in cannot run Metro against the Linux filesystem.
if [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "${NVM_DIR:-$HOME/.nvm}/nvm.sh" >/dev/null
fi
[ -d "$HOME/.local/bin" ] && PATH="$HOME/.local/bin:$PATH"
export PATH

# Install --force removes the venv that would otherwise be used to run this
# manager, so run install commands with the system interpreter.
if [[ "${1:-}" == "install" ]]; then
  PY="$(command -v python3)"
else
  PY="$ROOT/backend/.venv/bin/python"
  [ -x "$PY" ] || PY="$(command -v python3)"
fi

exec "$PY" "$ROOT/scripts/da.py" "$@"
