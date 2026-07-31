#!/usr/bin/env node
/**
 * Copies static files that `expo export --platform web` does not emit into
 * the build output.
 *
 * This replaces an inline `powershell -NoProfile -Command "Copy-Item ..."` in
 * the build:web script, which meant the build only worked on Windows. CI
 * (ubuntu-latest) and Render therefore ran the bare `expo export` and shipped
 * a dist/ with no _redirects — every deep link 404'd on the deployed site.
 */
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const dist = join(root, 'dist');

/** [source relative to frontend/, destination relative to dist/] */
const ASSETS = [
  ['public/_redirects', '_redirects'],
  ['public/service-worker.js', 'service-worker.js'],
];

if (!existsSync(dist)) {
  console.error(`[copy-web-assets] ${dist} does not exist — run the export first.`);
  process.exit(1);
}

let copied = 0;
let missing = 0;

for (const [from, to] of ASSETS) {
  const src = join(root, from);
  const dest = join(dist, to);

  if (!existsSync(src)) {
    console.warn(`[copy-web-assets] skipped, not found: ${from}`);
    missing += 1;
    continue;
  }

  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`[copy-web-assets] ${from} -> dist/${to}`);
  copied += 1;
}

// _redirects is required for SPA routing; treat its absence as a build failure.
if (!existsSync(join(dist, '_redirects'))) {
  console.error('[copy-web-assets] dist/_redirects missing — SPA deep links will 404.');
  process.exit(1);
}

console.log(`[copy-web-assets] done (${copied} copied, ${missing} skipped)`);
