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

/**
 * Stricter test used for call-argument literals.
 *
 * Argument position is far noisier than attribute position — it also holds
 * route names, storage keys, icon names, API paths and style values — so a
 * literal only counts as user copy if it reads like a phrase: it must contain
 * a lowercase letter and either a space or sentence punctuation, or be a
 * single Capitalised word of reasonable length.
 */
function looksLikeUiCopy(value) {
  const text = value.trim();
  if (!looksUserFacingText(text)) return false;
  if (text.length < 3) return false;
  if (!/[a-z]/.test(text)) return false;
  if (text.includes('/') || text.includes('\\')) return false;   // paths, routes
  if (/^[\w-]+(\.[\w-]+)+$/.test(text)) return false;            // i18n keys, dotted ids
  if (/^[a-z][a-zA-Z0-9]*$/.test(text)) return false;            // camelCase identifiers
  if (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(text)) return false;       // kebab-case / icon names
  if (/^#[0-9a-fA-F]{3,8}$/.test(text)) return false;            // colours
  if (/^\d+(px|%|em|rem)?$/.test(text)) return false;            // dimensions
  const hasSpace = /\s/.test(text);
  const isCapitalisedWord = /^[A-Z][a-z]{2,}$/.test(text);
  return hasSpace || isCapitalisedWord;
}

/**
 * Calls whose string arguments are never user-facing. Anything not listed is
 * still filtered by looksLikeUiCopy, so this is a precision aid, not the gate.
 */
const NON_UI_CALLS = new Set([
  'require', 'import', 'navigate', 'push', 'replace', 'fetch', 'get', 'post',
  'put', 'patch', 'delete', 'getItem', 'setItem', 'removeItem', 'deleteItemAsync',
  'getItemAsync', 'setItemAsync', 'addEventListener', 'removeEventListener',
  'createContext', 'RegExp', 'Error', 'split', 'join', 'includes', 'startsWith',
  'endsWith', 'match', 'test', 'parseInt', 'parseFloat', 'Number', 'String',
  'querySelector', 'querySelectorAll', 'getElementById', 'setAttribute',
  'getAttribute', 'emit', 'on', 'off', 'once', 'log', 'warn', 'error', 'info',
  'debug', 'trace', 'assert', 'setValue', 'register', 'watch', 'setFocus',
  'toLowerCase', 'toUpperCase', 'trim', 'concat', 'indexOf', 'localeCompare',
]);

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

/**
 * Blank out translation calls so their key arguments are not mistaken for
 * copy, while leaving the rest of the line scannable.
 *
 * The previous version skipped the ENTIRE line whenever it contained the
 * substring "t(" — which also matched `useEffect(`, `parseInt(`, `.split(`,
 * `.sort(` and `Alert.alert(`, silently disabling the check on a large share
 * of lines. It also meant `label={ok ? t('a') : 'Hardcoded'}` was skipped
 * wholesale rather than flagging the hardcoded branch.
 */
function stripTranslationCalls(line) {
  return line.replace(
    /\b(?:i18n\.)?(?:t|useT)\(\s*(['"`])(?:\\.|(?!\1)[^\\])*\1/g,
    '__T__',
  );
}

function scanLine(rel, rawLine, lineNumber, allowlist) {
  const line = stripTranslationCalls(rawLine);

  const attrRegex = /\b(title|label|placeholder|accessibilityLabel|accessibilityHint|helperText|subtitle|message|confirmText|cancelText|header|heading|caption|tabBarLabel|emptyText|errorText)\s*[:=]\s*['"]([^'"]+)['"]/g;
  const textNodeRegex = />\s*([^<>{][^<]*)\s*</g;
  // A quoted literal passed as a call argument: `field('k', 'First name *')`.
  const callArgRegex = /\b([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g;
  const literalInArgs = /(['"])((?:\\.|(?!\1)[^\\])*)\1/g;

  let match;
  while ((match = attrRegex.exec(line)) !== null) {
    const literal = match[2].trim();
    if (looksUserFacingText(literal)) {
      recordFinding(rel, lineNumber, 'attribute', literal, allowlist);
    }
  }

  while ((match = textNodeRegex.exec(line)) !== null) {
    const literal = match[1].trim();
    // A text node containing an expression (`R{value.toFixed(0)}`) is not a
    // translatable unit — it is markup plus a computed value. Flagging it
    // produced findings no one could action.
    if (literal.includes('{') || literal.includes('}')) continue;
    if (looksUserFacingText(literal)) {
      recordFinding(rel, lineNumber, 'JSX text', literal, allowlist);
    }
  }

  while ((match = callArgRegex.exec(line)) !== null) {
    const callee = match[1];
    const args = match[2];
    if (NON_UI_CALLS.has(callee)) continue;
    let argMatch;
    literalInArgs.lastIndex = 0;
    while ((argMatch = literalInArgs.exec(args)) !== null) {
      const literal = argMatch[2].trim();
      if (looksLikeUiCopy(literal)) {
        recordFinding(rel, lineNumber, 'call argument', literal, allowlist);
      }
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

/** `file:line kind literal: "x"` -> file */
function fileOf(finding) {
  return finding.slice(0, finding.indexOf(':'));
}

function summarise(label, entries, limit) {
  const byFile = new Map();
  for (const entry of entries) {
    const file = fileOf(entry);
    byFile.set(file, (byFile.get(file) ?? 0) + 1);
  }
  process.stdout.write(`\n${label}: ${entries.length} in ${byFile.size} file(s)\n`);
  const ranked = [...byFile.entries()].sort((a, b) => b[1] - a[1]);
  for (const [file, count] of ranked.slice(0, limit)) {
    process.stdout.write(`  ${String(count).padStart(4)}  ${file}\n`);
  }
  if (ranked.length > limit) {
    process.stdout.write(`  … and ${ranked.length - limit} more file(s)\n`);
  }
}

function main() {
  // Report-only surfaces the true scope without failing the build, so a
  // newly-tightened rule can be triaged before it starts blocking merges.
  const reportOnly = process.argv.includes('--report-only');
  const allowlist = loadAllowlist();
  const targets = SOURCE_DIRS.map((dir) => path.join(ROOT, dir));
  const files = [];

  for (const dir of targets) {
    listFiles(dir, files);
  }

  for (const filePath of files) {
    scanFile(filePath, allowlist);
  }

  // Machine-readable per-file totals. The human summary truncates to the worst
  // offenders, which makes quiet files indistinguishable from clean ones — use
  // this when you need the complete picture (e.g. a per-screen audit).
  if (process.argv.includes('--json')) {
    const perFile = {};
    for (const entry of [...findings, ...suppressed]) {
      const file = fileOf(entry);
      perFile[file] = (perFile[file] ?? 0) + 1;
    }
    process.stdout.write(JSON.stringify({
      scanned: files.length,
      blocking: findings.length,
      suppressed: suppressed.length,
      perFile,
    }, null, 2) + '\n');
    return;
  }

  if (reportOnly) {
    process.stdout.write(
      `Hardcoded text REPORT-ONLY — scanned ${files.length} file(s). Nothing is blocked.\n`,
    );
    summarise('BLOCKING (not allowlisted)', findings, 25);
    summarise('SUPPRESSED (allowlisted baseline)', suppressed, 15);
    const byKind = new Map();
    for (const entry of [...findings, ...suppressed]) {
      const kind = /\s(attribute|JSX text|call argument)\sliteral:/.exec(entry)?.[1] ?? 'other';
      byKind.set(kind, (byKind.get(kind) ?? 0) + 1);
    }
    process.stdout.write('\nBy kind (all findings):\n');
    for (const [kind, count] of [...byKind.entries()].sort((a, b) => b[1] - a[1])) {
      process.stdout.write(`  ${String(count).padStart(5)}  ${kind}\n`);
    }
    return;
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
