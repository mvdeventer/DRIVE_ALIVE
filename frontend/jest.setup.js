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
