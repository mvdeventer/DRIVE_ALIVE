// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude browser-only libraries (jspdf, exceljs) from native bundles.
// These cause "Maximum call stack size exceeded" and "Object is not a constructor"
// errors when Metro resolves them for Android/iOS (even with dynamic imports).
// They are only used in web export functions behind Platform.OS === 'web' guards.
const BROWSER_ONLY_MODULES = ['jspdf', 'exceljs'];
const emptyModule = path.resolve(__dirname, 'utils', 'emptyModule.js');

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== 'web' && BROWSER_ONLY_MODULES.includes(moduleName)) {
    return {
      filePath: emptyModule,
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
