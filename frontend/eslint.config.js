/**
 * ESLint flat config (ESLint 9).
 *
 * Replaces the old .eslintrc.js, which was never actually runnable — eslint
 * was not in devDependencies and there was no `lint` script, so `make lint`
 * failed at its frontend step.
 *
 * The react-native-a11y rules are the enforcement arm of the accessibility
 * work in components/ui: they catch pressables with no accessible name,
 * missing accessibilityRole, and touchables without state.
 *
 * NOTE on the peer override in package.json:
 * eslint-plugin-react-native-a11y@3.5.1 is the newest release and still
 * declares a peer of eslint <=8, while this project runs eslint 9. Its rules
 * do run correctly on 9 (they emit findings here), so package.json pins
 * `overrides["eslint-plugin-react-native-a11y"].eslint = "$eslint"`. Without
 * that, every `npm install` fails ERESOLVE and needs --legacy-peer-deps.
 * Drop the override once upstream widens its peer range.
 */
const expoFlat = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');
const a11y = require('eslint-plugin-react-native-a11y');

module.exports = [
  ...expoFlat,
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.expo/**',
      'web-build/**',
      'coverage/**',
      'cypress/videos/**',
      'cypress/screenshots/**',
      'utils/emptyModule.js',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: { 'react-native-a11y': a11y },
    rules: {
      'import/order': 'off',
      'import/namespace': 'off',
      'no-duplicate-imports': 'error',
      // Apostrophes and quotes in JSX text are fine in React 19 / RN <Text>.
      // This rule only produced noise on copy that i18n should own anyway.
      'react/no-unescaped-entities': 'off',

      // ── Accessibility ──────────────────────────────────────
      // Warnings, not errors: the app has ~100 source files and only a
      // handful carried a11y attributes before this pass. Tighten to 'error'
      // per-rule as each screen is migrated.
      'react-native-a11y/has-accessibility-hint': 'off',
      'react-native-a11y/has-valid-accessibility-ignores-invert-colors': 'off',
      'react-native-a11y/has-valid-accessibility-actions': 'warn',
      'react-native-a11y/has-valid-accessibility-component-type': 'warn',
      'react-native-a11y/has-valid-accessibility-descriptors': 'warn',
      'react-native-a11y/has-valid-accessibility-role': 'warn',
      'react-native-a11y/has-valid-accessibility-state': 'warn',
      'react-native-a11y/has-valid-accessibility-value': 'warn',
      'react-native-a11y/no-nested-touchables': 'warn',

      // ── Cross-platform safety (AGENTS.md) ──────────────────
      // Browser-only globals must not appear in shared React Native code.
      // Guarded uses inside `Platform.OS === 'web'` still trip this — add a
      // targeted eslint-disable line with a comment explaining the guard.
      'no-restricted-globals': [
        'warn',
        { name: 'document', message: 'Browser-only. Guard with Platform.OS === "web" and disable this rule on the line.' },
        { name: 'localStorage', message: 'Use AsyncStorage / expo-secure-store instead.' },
      ],
    },
  },
  {
    // Cypress specs and node scripts are web/node-only by definition.
    files: ['cypress/**/*.{ts,tsx,js}', 'scripts/**/*.mjs', '*.config.js'],
    rules: {
      'no-restricted-globals': 'off',
      'react-native-a11y/has-valid-accessibility-descriptors': 'off',
    },
  },
  {
    // Jest globals.
    files: ['**/__tests__/**/*.{ts,tsx,js}', '**/*.test.{ts,tsx,js}', 'jest.setup.js'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
  prettier,
];
