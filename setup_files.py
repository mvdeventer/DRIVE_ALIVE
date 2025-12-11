"""
Drive Alive - File Creation Script
Run this AFTER creating directories with create_dirs.py
"""

import pathlib

BASE_DIR = pathlib.Path(__file__).parent

# File contents dictionary
FILES = {
    # Documentation files created via create_dirs.py are ready
    # Backend __init__ files
    "backend/app/__init__.py": '"""Drive Alive Backend Application Package"""\n\n__version__ = "1.0.0"\n',
    "backend/app/models/__init__.py": '"""Database Models Package"""\n',
    "backend/app/routes/__init__.py": '"""API Routes Package"""\n',
    "backend/app/services/__init__.py": '"""Business Logic Services Package"""\n',
    "backend/app/utils/__init__.py": '"""Utility Functions Package"""\n',
    "backend/app/middleware/__init__.py": '"""Middleware Package"""\n',
    "backend/tests/__init__.py": '"""Tests Package"""\n',
    # Frontend component index files
    "frontend/components/README.md": "# Reusable Components\n\nPlace shared UI components here.\n",
    "frontend/screens/README.md": "# App Screens\n\nPlace screen components here.\n",
    "frontend/services/README.md": "# Services\n\nAPI calls and external service integrations.\n",
    "frontend/utils/README.md": "# Utilities\n\nHelper functions and utilities.\n",
    "frontend/navigation/README.md": "# Navigation\n\nReact Navigation setup and navigators.\n",
    # Asset README files
    "frontend/assets/images/README.md": "# Images\n\nPlace image assets here.\n",
    "frontend/assets/icons/README.md": "# Icons\n\nPlace icon files here.\n",
    "frontend/assets/fonts/README.md": "# Fonts\n\nPlace custom fonts here.\n",
    # Test README files
    "tests/frontend/README.md": "# Frontend Tests\n\nJest tests for React Native components.\n",
    "tests/backend/README.md": "# Backend Tests\n\nPytest tests for FastAPI endpoints.\n",
    # GitHub workflows placeholder
    ".github/workflows/README.md": "# CI/CD Workflows\n\nGitHub Actions workflows for automated testing and deployment.\n",
}


def create_files():
    """Create all project files"""
    print("Creating project files...\n")

    for file_path, content in FILES.items():
        full_path = BASE_DIR / file_path

        try:
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content, encoding="utf-8")
            print(f"✓ Created: {file_path}")
        except Exception as e:
            print(f"✗ Failed: {file_path} - {e}")

    print("\n✅ All files created successfully!")
    print("\nNext steps:")
    print("1. cd backend && python -m venv venv")
    print("2. cd backend && venv\\Scripts\\activate && pip install -r requirements.txt")
    print("3. cd frontend && npm install")
    print("4. Open DRIVE_ALIVE.code-workspace in VS Code")


if __name__ == "__main__":
    create_files()
