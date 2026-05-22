/**
 * AppImage — fast, cached image wrapper around expo-image.
 *
 * Use this instead of `Image` from 'react-native' so we get:
 *   - memory + disk cache (faster repeat loads)
 *   - blurhash placeholder (instant paint, no layout shift)
 *   - fade-in transition
 */
import { Image, ImageProps } from 'expo-image';
import React from 'react';

// Neutral grey blurhash; replace per-image if you have a real one.
const DEFAULT_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export interface AppImageProps extends ImageProps {
  /** Override the default placeholder blurhash. */
  blurhash?: string;
}

export default function AppImage({ blurhash, ...props }: AppImageProps) {
  return (
    <Image
      transition={200}
      cachePolicy="memory-disk"
      placeholder={blurhash ?? DEFAULT_BLURHASH}
      contentFit="cover"
      {...props}
    />
  );
}
