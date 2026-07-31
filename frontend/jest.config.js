// KNOWN GAP: this uses the bare `react-native` preset, not `jest-expo`. Any
// suite that transitively imports an expo-modules-core module (expo-secure-store,
// expo-haptics, …) dies with "Cannot read properties of undefined (reading
// 'EventEmitter')". That is why screens/__tests__/DatabaseInterfaceScreen.test.tsx
// and services/__tests__/database-interface.test.ts do not run.
// Fixing it needs jest-expo, which currently peer-conflicts with jest 30.
// Track before relying on component-level test coverage.
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
