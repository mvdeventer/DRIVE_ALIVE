#!/usr/bin/env bash
# Render Frontend Build Script

set -o errexit  # Exit on error

# Install dependencies
npm install

# Build web version
npx expo export:web

echo "Frontend build complete! Files in dist/"
