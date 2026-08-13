/**
 * Jest setup — native module mocks that must be registered before any module
 * under test imports them.
 */

// theme/ThemeContext.tsx persists the light/dark choice through AsyncStorage.
// Without this mock the native module is null under Jest and every suite that
// transitively imports the theme fails at import time.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Reanimated drives AnimatedPressable, FadeInView, Skeleton and TabBar. Its
// worklet runtime has no JSDOM equivalent, so use the shipped mock.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// expo-modules-core builds its EventEmitter against a native registry that does
// not exist under the bare `react-native` preset, so *importing* any expo-*
// module throws "Cannot read properties of undefined (reading 'EventEmitter')"
// before a single assertion runs. i18n/index.tsx imports expo-secure-store, and
// i18n is imported by almost every screen, so this took out whole suites.
// jest-expo would fix it properly but peer-conflicts with jest 30.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
  isAvailableAsync: jest.fn(async () => false),
  WHEN_UNLOCKED: 'whenUnlocked',
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: null })),
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///test/',
  cacheDirectory: 'file:///test-cache/',
  readAsStringAsync: jest.fn(async () => ''),
  writeAsStringAsync: jest.fn(async () => undefined),
  deleteAsync: jest.fn(async () => undefined),
  getInfoAsync: jest.fn(async () => ({ exists: false })),
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
}));
