/**
 * Text Encoding Polyfill for React Native (Android & iOS)
 * ExcelJS requires TextDecoder with latin1 encoding, which is not natively supported.
 * 
 * Strategy: Extend native TextDecoder to add latin1 support without breaking existing functionality.
 * - Android: Wraps native Hermes TextDecoder, adds latin1 handling
 * - iOS: Provides full implementation if missing, adds latin1 support
 * - Web: No-op (browser has full support)
 */

import { Platform } from 'react-native';

// Skip polyfill on web (browsers support latin1)
if (Platform.OS !== 'web') {
  // Save reference to native implementation (if it exists)
  const NativeTextDecoder = global.TextDecoder;
  const NativeTextEncoder = global.TextEncoder;

  // Polyfill TextEncoder if missing (usually available on Android/iOS)
  if (!NativeTextEncoder) {
    // @ts-ignore
    global.TextEncoder = class TextEncoder {
      encode(str: string): Uint8Array {
        const buf = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
          buf[i] = str.charCodeAt(i);
        }
        return buf;
      }
    };
  }

  // Extend TextDecoder to support latin1 (works on both Android and iOS)
  // @ts-ignore
  global.TextDecoder = class TextDecoder {
    encoding: string;
    private nativeDecoder: any;

    constructor(encoding: string = 'utf-8') {
      this.encoding = encoding.toLowerCase();
      
      // Try to create native decoder for non-latin1 encodings
      if (NativeTextDecoder && this.encoding !== 'latin1' && this.encoding !== 'iso-8859-1') {
        try {
          this.nativeDecoder = new NativeTextDecoder(this.encoding);
        } catch (e) {
          // Encoding not supported natively, will use fallback
          this.nativeDecoder = null;
        }
      } else {
        this.nativeDecoder = null;
      }
    }

    decode(arr?: Uint8Array | ArrayBuffer): string {
      if (!arr) return '';
      const uint8Array = arr instanceof Uint8Array ? arr : new Uint8Array(arr);

      // Handle latin1 encoding (required by ExcelJS, not supported natively)
      if (this.encoding === 'latin1' || this.encoding === 'iso-8859-1') {
        let str = '';
        for (let i = 0; i < uint8Array.length; i++) {
          str += String.fromCharCode(uint8Array[i]);
        }
        return str;
      }

      // Handle ASCII encoding
      if (this.encoding === 'ascii') {
        let str = '';
        for (let i = 0; i < uint8Array.length; i++) {
          str += String.fromCharCode(uint8Array[i] & 0x7f);
        }
        return str;
      }

      // Use native decoder if available (preserves Android/iOS native behavior)
      if (this.nativeDecoder) {
        return this.nativeDecoder.decode(uint8Array);
      }

      // Fallback: Manual UTF-8 decoding
      let str = '';
      for (let i = 0; i < uint8Array.length; i++) {
        str += String.fromCharCode(uint8Array[i]);
      }
      try {
        return decodeURIComponent(escape(str));
      } catch (e) {
        return str;
      }
    }
  };
}

export {};

export {};
