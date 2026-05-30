from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path
from typing import Callable


def _run(cmd: list[str], *, cwd: Path, capture_output: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd,
        cwd=cwd,
        encoding="utf-8",
        errors="replace",
        text=True,
        capture_output=capture_output,
        check=True,
    )


def _find_inno_compiler() -> Path:
    env_path = os.environ.get("ISCC_PATH", "").strip()
    candidates: list[Path] = []
    if env_path:
        candidates.append(Path(env_path))
    which_path = shutil.which("ISCC")
    if which_path:
        candidates.append(Path(which_path))
    candidates.extend([
        Path(r"C:/Program Files (x86)/Inno Setup 6/ISCC.exe"),
        Path(r"C:/Program Files/Inno Setup 6/ISCC.exe"),
        Path.home() / "AppData" / "Local" / "Programs" / "Inno Setup 6" / "ISCC.exe",
    ])
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise RuntimeError("Inno Setup compiler (ISCC.exe) was not found. Install Inno Setup 6 or set ISCC_PATH.")


def stage_paths(root: Path, paths: list[Path]) -> None:
    normal_paths: list[str] = []
    forced_paths: list[str] = []
    for relative_path in (path.relative_to(root).as_posix() for path in paths):
        check_ignore = subprocess.run(
            ["git", "check-ignore", "-q", "--", relative_path],
            cwd=root,
            encoding="utf-8",
            errors="replace",
            text=True,
            capture_output=True,
            check=False,
        )
        is_ignored = check_ignore.returncode == 0
        if relative_path.startswith("dist/") or is_ignored:
            forced_paths.append(relative_path)
        else:
            normal_paths.append(relative_path)

    try:
        if normal_paths:
            _run(["git", "add", "--", *normal_paths], cwd=root)
        if forced_paths:
            _run(["git", "add", "-f", "--", *forced_paths], cwd=root)
    except subprocess.CalledProcessError as exc:
        details = (exc.stderr or exc.stdout or "").strip()
        raise RuntimeError(details or "Failed to stage release files with git add.") from exc


def build_release_installer(
    *,
    root: Path,
    backend_dir: Path,
    frontend_dir: Path,
    installer_file: Path,
    version: str,
    info: Callable[[str], None],
    ok: Callable[[str], None],
) -> Path:
    info("Building offline dependency bundle (vendor/)...")
    _run(["python", "bootstrap.py", "--bundle"], cwd=root, capture_output=False)

    info("Building frontend web distribution...")
    _run(["npm", "--prefix", str(frontend_dir), "run", "build:web"], cwd=root, capture_output=False)

    backend_python = backend_dir / "venv" / "Scripts" / "python.exe"
    if not backend_python.exists():
        raise RuntimeError(f"Backend venv Python not found at {backend_python}. Run s.bat install first.")

    info("Building backend executable with PyInstaller...")
    _run(
        [str(backend_python), "-m", "PyInstaller", "drive-alive.spec", "--clean"],
        cwd=backend_dir,
        capture_output=False,
    )

    iscc = _find_inno_compiler()
    info(f"Compiling Windows installer with {iscc}...")
    _run([str(iscc), str(installer_file)], cwd=root, capture_output=False)

    installer_asset = root / "dist" / f"DriveAlive-Setup-{version}.exe"
    if not installer_asset.exists():
        raise RuntimeError(f"Installer build completed but expected asset was not found: {installer_asset}")
    ok(f"Installer generated: {installer_asset}")
    return installer_asset
