/**
 * Map Preview Component - Platform-specific export
 * TypeScript-compatible wrapper that resolves to .native.tsx or .web.tsx
 */
import { Platform } from 'react-native';

// Platform-specific imports
let MapPreview: any;

if (Platform.OS === 'web') {
  MapPreview = require('./MapPreview.web').default;
} else {
  MapPreview = require('./MapPreview.native').default;
}

export default MapPreview;
