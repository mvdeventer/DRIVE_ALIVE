/**
 * Shared type for the platform-specific map preview.
 *
 * The implementation lives in MapPreview.web.tsx and MapPreview.native.tsx,
 * which Metro picks between at build time. TypeScript does not resolve those
 * suffixes, so importing './MapPreview' had no declaration to bind to and
 * the module read as missing. This states the contract both sides honour.
 */
import type { ComponentType } from 'react';

export interface MapPreviewProps {
  latitude: number;
  longitude: number;
}

declare const MapPreview: ComponentType<MapPreviewProps>;

export default MapPreview;
