"""
Drive Alive - Complete Setup Script
Combines directory creation and file creation into one script
"""
import pathlib
import sys

BASE_DIR = pathlib.Path(__file__).parent

# Directory structure
DIRS = [
    "frontend/assets/images",
    "frontend/assets/icons",
    "frontend/assets/fonts",
    "frontend/components/common",
    "frontend/components/instructor",
    "frontend/components/student",
    "frontend/screens/auth",
    "frontend/screens/instructor",
    "frontend/screens/student",
    "frontend/screens/booking",
    "frontend/screens/payment",
    "frontend/navigation",
    "frontend/services/api",
    "frontend/services/firebase",
    "frontend/utils",
    "backend/app/models",
    "backend/app/routes",
    "backend/app/services",
    "backend/app/utils",
    "backend/app/middleware",
    "backend/tests",
    "docs",
    "config",
    "tests/frontend",
    "tests/backend",
    ".vscode",
    ".github/workflows",
]

# File contents
FILES = {
    "backend/app/__init__.py": '"""Drive Alive Backend Application Package"""\n\n__version__ = "1.0.0"\n',
    "backend/app/models/__init__.py": '"""Database Models Package"""\n',
    "backend/app/routes/__init__.py": '"""API Routes Package"""\n',
    "backend/app/services/__init__.py": '"""Business Logic Services Package"""\n',
    "backend/app/utils/__init__.py": '"""Utility Functions Package"""\n',
    "backend/app/middleware/__init__.py": '"""Middleware Package"""\n',
    "backend/tests/__init__.py": '"""Tests Package"""\n',
    "frontend/components/README.md": "# Reusable Components\n\nPlace shared UI components here.\n",
    "frontend/screens/README.md": "# App Screens\n\nPlace screen components here.\n",
    "frontend/services/README.md": "# Services\n\nAPI calls and external service integrations.\n",
    "frontend/utils/README.md": "# Utilities\n\nHelper functions and utilities.\n",
    "frontend/navigation/README.md": "# Navigation\n\nReact Navigation setup and navigators.\n",
    "frontend/assets/images/README.md": "# Images\n\nPlace image assets here.\n",
    "frontend/assets/icons/README.md": "# Icons\n\nPlace icon files here.\n",
    "frontend/assets/fonts/README.md": "# Fonts\n\nPlace custom fonts here.\n",
    "tests/frontend/README.md": "# Frontend Tests\n\nJest tests for React Native components.\n",
    "tests/backend/README.md": "# Backend Tests\n\nPytest tests for FastAPI endpoints.\n",
    ".github/workflows/README.md": "# CI/CD Workflows\n\nGitHub Actions workflows for automated testing and deployment.\n",
}

def create_directories():
    """Create all project directories"""
    print("=" * 60)
    print("DRIVE ALIVE - PROJECT SETUP")
    print("=" * 60)
    print("\n[1/2] Creating directory structure...\n")
    
    created = 0
    for dir_path in DIRS:
        full_path = BASE_DIR / dir_path
        try:
            full_path.mkdir(parents=True, exist_ok=True)
            print(f"✓ Created: {dir_path}")
            created += 1
        except Exception as e:
            print(f"✗ Failed: {dir_path} - {e}")
            return False
    
    print(f"\n✅ Created {created} directories successfully!")
    return True

def create_files():
    """Create all configuration files"""
    print("\n[2/2] Creating configuration files...\n")
    
    created = 0
    for file_path, content in FILES.items():
        full_path = BASE_DIR / file_path
        try:
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content, encoding='utf-8')
            print(f"✓ Created: {file_path}")
            created += 1
        except Exception as e:
            print(f"✗ Failed: {file_path} - {e}")
    
    print(f"\n✅ Created {created} files successfully!")
    return True

def main():
    """Main setup function"""
    try:
        # Create directories
        if not create_directories():
            print("\n❌ Directory creation failed!")
            sys.exit(1)
        
        # Create files
        if not create_files():
            print("\n⚠️  Some files failed to create, but continuing...")
        
        # Success message
        print("\n" + "=" * 60)
        print("✅ SETUP COMPLETE!")
        print("=" * 60)
        print("\n📋 Project structure is ready!")
        print("\n🚀 Next steps:")
        print("   1. Setup backend:  cd backend && python -m venv venv")
        print("   2. Activate venv:  cd backend && venv\\Scripts\\activate")
        print("   3. Install deps:   pip install -r requirements.txt")
        print("   4. Setup frontend: cd frontend && npm install")
        print("   5. Open VS Code:   code DRIVE_ALIVE.code-workspace")
        print("\n📚 Documentation:")
        print("   - QUICKSTART.md     - 5-minute quick start guide")
        print("   - SETUP_GUIDE.md    - Comprehensive setup instructions")
        print("   - PROJECT_STATUS.md - Project status and checklist")
        print("   - docs/AGENTS.md    - Team roles and TODO list")
        print("\n🎯 Happy coding! 🚗")
        
    except Exception as e:
        print(f"\n❌ Setup failed with error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
