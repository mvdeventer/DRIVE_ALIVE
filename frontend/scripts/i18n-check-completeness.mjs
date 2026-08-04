#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const LOCALES_DIR = path.resolve(process.cwd(), 'i18n', 'locales');
const LOCALES = ['en', 'af'];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function extractObjectLiteral(fileText, exportName) {
  const marker = `export const ${exportName}`;
  const start = fileText.indexOf(marker);
  if (start === -1) {
    throw new Error(`Missing export for locale '${exportName}'`);
  }

  const eqIndex = fileText.indexOf('=', start);
  if (eqIndex === -1) {
    throw new Error(`Could not find '=' for locale '${exportName}'`);
  }

  const braceStart = fileText.indexOf('{', eqIndex);
  if (braceStart === -1) {
    throw new Error(`Could not find opening '{' for locale '${exportName}'`);
  }

  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let escaped = false;

  for (let i = braceStart; i < fileText.length; i += 1) {
    const ch = fileText[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (!inDouble && !inTemplate && ch === "'") {
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle && !inTemplate && ch === '"') {
      inDouble = !inDouble;
      continue;
    }
    if (!inSingle && !inDouble && ch === '`') {
      inTemplate = !inTemplate;
      continue;
    }

    if (inSingle || inDouble || inTemplate) {
      continue;
    }

    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return fileText.slice(braceStart, i + 1);
      }
    }
  }

  throw new Error(`Unterminated object literal for locale '${exportName}'`);
}

function parseLocaleFile(code) {
  const filePath = path.join(LOCALES_DIR, `${code}.ts`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing locale file: ${filePath}`);
  }
  const text = fs.readFileSync(filePath, 'utf8');
  const objectLiteral = extractObjectLiteral(text, code);
  return Function(`"use strict"; return (${objectLiteral});`)();
}

function flattenKeys(input, prefix = '', output = []) {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    for (const key of Object.keys(input)) {
      const next = prefix ? `${prefix}.${key}` : key;
      flattenKeys(input[key], next, output);
    }
    return output;
  }
  output.push(prefix);
  return output;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function main() {
  const dictionaries = {};

  for (const code of LOCALES) {
    dictionaries[code] = parseLocaleFile(code);
  }

  const baseKeys = uniqueSorted(flattenKeys(dictionaries.en));
  let failed = false;

  for (const code of LOCALES) {
    if (code === 'en') {
      continue;
    }

    const keys = uniqueSorted(flattenKeys(dictionaries[code]));
    const missing = baseKeys.filter((k) => !keys.includes(k));
    const extra = keys.filter((k) => !baseKeys.includes(k));

    if (missing.length > 0) {
      failed = true;
      console.error(`\nLocale '${code}' is missing ${missing.length} key(s):`);
      for (const key of missing) {
        console.error(`  - ${key}`);
      }
    }

    if (extra.length > 0) {
      console.warn(`\nLocale '${code}' has ${extra.length} extra key(s) not in 'en':`);
      for (const key of extra) {
        console.warn(`  - ${key}`);
      }
    }
  }

  if (failed) {
    fail('\ni18n completeness check failed.');
  }

  console.log(`i18n completeness check passed for locales: ${LOCALES.join(', ')}`);
}

main();
