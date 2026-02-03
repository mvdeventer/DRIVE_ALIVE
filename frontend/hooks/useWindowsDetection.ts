/**
 * Hook for detecting Windows PC web browser access
 * Platform: Windows PC Web Browsers ONLY
 * Blocks: Mobile devices, tablets, macOS, Linux
 */

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

interface PlatformDetection {
  isWindows: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPlatformAllowed: boolean;
  platformWarning: string | null;
  browserName: string;
}

export const useWindowsDetection = (): PlatformDetection => {
  const [detection, setDetection] = useState<PlatformDetection>({
    isWindows: false,
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isPlatformAllowed: false,
    platformWarning: null,
    browserName: 'Unknown',
  });

  useEffect(() => {
    if (Platform.OS !== 'web') {
      // React Native (iOS/Android)
      setDetection({
        isWindows: false,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isPlatformAllowed: false,
        platformWarning: '📱 Database Interface is not available on mobile devices. Please use a Windows PC with a desktop browser.',
        browserName: Platform.OS,
      });
      return;
    }

    // Web browser detection
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();

    // Check Windows
    const isWindows = 
      platform.includes('win') || 
      userAgent.includes('windows nt') ||
      userAgent.includes('win32') ||
      userAgent.includes('win64');

    // Check mobile/tablet
    const isMobile = /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTablet = /ipad|android|tablet|kindle|playbook|silk|nexus 7|nexus 10|xoom|asustek computer/i.test(userAgent);

    // Detect browser
    let browserName = 'Unknown';
    if (userAgent.includes('edge')) browserName = 'Edge';
    else if (userAgent.includes('chrome')) browserName = 'Chrome';
    else if (userAgent.includes('firefox')) browserName = 'Firefox';
    else if (userAgent.includes('safari')) browserName = 'Safari';
    else if (userAgent.includes('opera')) browserName = 'Opera';

    // Check screen size (desktop should be at least 1366x768)
    const isDesktopResolution = window.innerWidth >= 1366 && window.innerHeight >= 600;

    const isPlatformAllowed = isWindows && !isMobile && !isTablet && isDesktopResolution;

    let warning: string | null = null;
    if (!isWindows) {
      warning = '🚫 Database Interface requires Windows PC. macOS and Linux are not supported.';
    } else if (isMobile) {
      warning = '📱 Database Interface is not available on mobile devices.';
    } else if (isTablet) {
      warning = '📱 Database Interface is not available on tablets.';
    } else if (!isDesktopResolution) {
      warning = `⚠️ Your screen is too small (${window.innerWidth}x${window.innerHeight}). Minimum resolution: 1366x768`;
    }

    setDetection({
      isWindows,
      isMobile,
      isTablet,
      isDesktop: !isMobile && !isTablet,
      isPlatformAllowed,
      platformWarning: warning,
      browserName,
    });
  }, []);

  return detection;
};

export default useWindowsDetection;
