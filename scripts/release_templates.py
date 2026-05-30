from __future__ import annotations

import textwrap


def install_guide(version: str) -> str:
    return textwrap.dedent(
        f"""
        # Install Drive Alive On A New Windows PC

        This guide installs Drive Alive {version} from the repository on a fresh Windows machine.

        ## Prerequisites

        - Windows 10 or later
        - Git
        - Python 3.9+
        - Node.js 18+
        - PostgreSQL 13+
        - GitHub CLI (`gh`) if you also plan to publish releases from this machine

        ## Repository Setup

        ```powershell
        git clone https://github.com/mvdeventer/DRIVE_ALIVE.git
        cd DRIVE_ALIVE
        ```

        ## One-Command Install

        ```powershell
        .\\s.bat install
        ```

        The install command prepares the backend virtual environment, installs backend and frontend dependencies, provisions the PostgreSQL database when possible, and writes `backend/.env` from `backend/.env.example`.

        ## Start The Full Stack

        ```powershell
        .\\s.bat start
        ```

        Services:

        - Frontend: `http://localhost:8081`
        - Backend API: `http://localhost:8000`
        - API docs: `http://localhost:8000/docs`

        ## Manual Recovery Steps

        ### Backend

        ```powershell
        cd backend
        python -m venv venv
        .\\venv\\Scripts\\python.exe -m pip install -r requirements.txt
        copy .env.example .env
        ```

        ### Frontend

        ```powershell
        cd frontend
        npm install
        ```

        ### Database

        - Ensure PostgreSQL is installed and running.
        - Confirm `DATABASE_URL` in `backend/.env` points at your local PostgreSQL instance.
        - Run migrations if needed:

        ```powershell
        cd backend
        .\\venv\\Scripts\\python.exe -m alembic upgrade head
        ```

        ## Installer Assets

        The Windows installer definition lives in `scripts/installer.iss`. Release automation validates the installer inputs and refreshes the shipped documentation and install manifest before publishing a GitHub release.
        """
    ).strip() + "\n"


def update_guide(version: str, release_tag: str) -> str:
    return textwrap.dedent(
        f"""
        # Update Drive Alive On Windows

        This guide upgrades an existing installation to Drive Alive {version}.

        ## Recommended Update Flow

        ```powershell
        git pull origin main
        .\\s.bat stop
        .\\s.bat install --force
        .\\s.bat start
        ```

        ## Database And Migration Steps

        If the backend schema changed, run:

        ```powershell
        cd backend
        .\\venv\\Scripts\\python.exe -m alembic upgrade head
        ```

        ## Release Artifacts

        - Review the GitHub release notes for migration notes and install changes.
        - Review `docs/releases/{release_tag}.md` for the repository copy of the published release notes.

        ## Rollback Guidance

        - Stop both services before restoring an older version.
        - Restore the previous database backup before rolling back application code.
        - Reinstall dependencies if the target release used a different dependency set.
        """
    ).strip() + "\n"


def release_workflow_guide() -> str:
    return textwrap.dedent(
        """
        # Release Workflow

        The project release entrypoint is the repository root command surface:

        ```powershell
        .\\s.bat release --minor
        .\\s.bat release --major
        ```

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
        .\\s.bat release --minor --dry-run
        ```

        Dry-run mode prints the planned version bump and validates the release inputs without writing files, tagging commits, or publishing to GitHub.
        """
    ).strip() + "\n"
