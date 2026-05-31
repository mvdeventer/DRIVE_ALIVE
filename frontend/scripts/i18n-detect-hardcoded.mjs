#!/usr/bin/env node
/* eslint-disable no-unused-vars */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SOURCE_DIRS = ['screens', 'components', 'navigation', 'app', 'features'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const ALLOWLIST_PATH = path.join(ROOT, 'i18n', 'hardcoded-allowlist.json');

const IGNORE_FILE_PATTERNS = [
  /\.d\.ts$/,
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
  /(^|[/\\])i18n([/\\]|$)/,
  /(^|[/\\])locales([/\\]|$)/,
  /(^|[/\\])node_modules([/\\]|$)/,
  /(^|[/\\])dist([/\\]|$)/,
  /(^|[/\\])build([/\\]|$)/,
  /(^|[/\\])coverage([/\\]|$)/,
];

const findings = [];
const suppressed = [];

function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) {
    return { ignorePathRegexes: [], ignoreLiteralRegexes: [] };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
    const pathRegexes = Array.isArray(parsed.ignorePathRegexes)
      ? parsed.ignorePathRegexes.map((pattern) => new RegExp(pattern))
      : [];
    const literalRegexes = Array.isArray(parsed.ignoreLiteralRegexes)
      ? parsed.ignoreLiteralRegexes.map((pattern) => new RegExp(pattern))
      : [];
    return { ignorePathRegexes: pathRegexes, ignoreLiteralRegexes: literalRegexes };
  } catch (error) {
    process.stderr.write(`Failed to parse allowlist file at ${ALLOWLIST_PATH}: ${error}\n`);
    process.exit(1);
  }
}

function normalize(p) {
  return p.split(path.sep).join('/');
}

function shouldIgnore(filePath) {
  const normalized = normalize(filePath);
  return IGNORE_FILE_PATTERNS.some((rx) => rx.test(normalized));
}

function listFiles(startDir, output = []) {
  if (!fs.existsSync(startDir)) {
    return output;
  }
  for (const entry of fs.readdirSync(startDir, { withFileTypes: true })) {
    const fullPath = path.join(startDir, entry.name);
    if (entry.isDirectory()) {
      listFiles(fullPath, output);
    } else if (EXTENSIONS.has(path.extname(entry.name)) && !shouldIgnore(fullPath)) {
      output.push(fullPath);
    }
  }
  return output;
}

function looksUserFacingText(value) {
  const text = value.trim();
  if (text.length < 2) return false;
  if (!/[A-Za-z]/.test(text)) return false;
  if (/^https?:\/\//.test(text)) return false;
  if (/^[A-Z0-9_\-.]+$/.test(text)) return false;
  return true;
}

function isSuppressed(relPath, literal, allowlist) {
  const pathSuppressed = allowlist.ignorePathRegexes.some((rx) => rx.test(relPath));
  const literalSuppressed = allowlist.ignoreLiteralRegexes.some((rx) => rx.test(literal));
  return pathSuppressed || literalSuppressed;
}

function recordFinding(rel, lineNumber, kind, literal, allowlist) {
  const finding = `${rel}:${lineNumber} ${kind} literal: "${literal}"`;
  if (isSuppressed(rel, literal, allowlist)) {
    suppressed.push(finding);
    return;
  }
  findings.push(finding);
}

function shouldSkipLine(line) {
  return ['t(', 'useT(', 'useI18n(', 'i18n.'].some((marker) => line.includes(marker));
}

function scanLine(rel, line, lineNumber, allowlist) {
  if (shouldSkipLine(line)) {
    return;
  }

  const attrRegex = /\b(title|label|placeholder|accessibilityLabel|helperText|subtitle|message|confirmText|cancelText)\s*[:=]\s*['"]([^'"]+)['"]/g;
  const textNodeRegex = />\s*([^<>{][^<]*)\s*</g;

  let match;
  while ((match = attrRegex.exec(line)) !== null) {
    const literal = match[2].trim();
    if (looksUserFacingText(literal)) {
      recordFinding(rel, lineNumber, 'attribute', literal, allowlist);
    }
  }

  while ((match = textNodeRegex.exec(line)) !== null) {
    const literal = match[1].trim();
    if (looksUserFacingText(literal)) {
      recordFinding(rel, lineNumber, 'JSX text', literal, allowlist);
    }
  }
}

function scanFile(filePath, allowlist) {
  const rel = normalize(path.relative(ROOT, filePath));
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    scanLine(rel, lines[i], i + 1, allowlist);
  }
}

function main() {
  const allowlist = loadAllowlist();
  const targets = SOURCE_DIRS.map((dir) => path.join(ROOT, dir));
  const files = [];

  for (const dir of targets) {
    listFiles(dir, files);
  }

  for (const filePath of files) {
    scanFile(filePath, allowlist);
  }

  if (findings.length > 0) {
    process.stderr.write(`Hardcoded text check failed with ${findings.length} finding(s):\n`);
    for (const finding of findings) {
      process.stderr.write(`  - ${finding}\n`);
    }
    process.exit(1);
  }

  if (suppressed.length > 0) {
    process.stdout.write(`Hardcoded text check passed with ${suppressed.length} suppressed finding(s) from allowlist.\n`);
    return;
  }

  process.stdout.write('Hardcoded text check passed.\n');
}

main();
