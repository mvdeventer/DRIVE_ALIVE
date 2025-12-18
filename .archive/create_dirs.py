import os
import pathlib

# Define directory structure
dirs = [
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

base_path = pathlib.Path(__file__).parent

print("Creating directory structure for Drive Alive...")
for dir_path in dirs:
    full_path = base_path / dir_path
    full_path.mkdir(parents=True, exist_ok=True)
    print(f"✓ Created: {dir_path}")

print("\n✅ Directory structure created successfully!")
print("\nNext steps:")
print("1. Run the project setup to create configuration files")
print("2. Setup backend: cd backend && python -m venv venv")
print("3. Setup frontend: cd frontend && npm install")
