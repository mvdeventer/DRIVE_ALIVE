// KNOWN GAP: this uses the bare `react-native` preset, not `jest-expo`, so any
// suite that transitively imports an expo-modules-core module dies at import
// time with "Cannot read properties of undefined (reading 'EventEmitter')".
// jest.setup.js mocks the expo-* modules this app actually imports, which is
// enough to keep suites running; a new expo-* import needs a mock adding there.
// The real fix is jest-expo, which currently peer-conflicts with jest 30.
module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    // These packages ship untranspiled ESM and must go through babel.
    // react-native-reanimated / -worklets were missing, which made every suite
    // that touches components/ui fail with "Cannot use import statement
    // outside a module".
    // `expo` alone did not match `expo-secure-store`, `expo-haptics`, etc.
    'node_modules/(?!((jest-)?react-native(-.*)?|@react-native(-community)?(/.*)?|@react-navigation(/.*)?|expo(-.*)?|@expo(-.*)?(/.*)?|@expo-google-fonts(/.*)?|@tanstack(/.*)?)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.(ts|tsx|js)'],
  collectCoverageFrom: [
    'screens/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/__tests__/**',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
  },
};
