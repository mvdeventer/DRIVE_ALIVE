#!/usr/bin/env bash
# Render Frontend Build Script

set -o errexit  # Exit on error

# Install dependencies
npm ci

# Build web version. `expo export:web` was removed in SDK 50+; build:web runs
# `expo export --platform web` and then copies public/_redirects into dist/ so
# SPA deep links resolve.
npm run build:web

echo "Frontend build complete! Files in dist/"
