#!/usr/bin/env bash
# Render Backend Build Script

set -o errexit  # Exit on error

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Run database migrations (if using Alembic)
# alembic upgrade head

echo "Backend build complete!"
