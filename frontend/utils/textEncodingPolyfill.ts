/**
 * Text Encoding Polyfill for React Native
 * ExcelJS requires TextDecoder with latin1 encoding, which is not supported in React Native/Hermes.
 * This polyfill OVERRIDES the native TextDecoder to add latin1 support.
 */

// @ts-ignore - Override global TextEncoder
global.TextEncoder = class TextEncoder {
  encode(str: string): Uint8Array {
    const buf = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      buf[i] = str.charCodeAt(i);
    }
    return buf;
  }
};

// @ts-ignore - Override global TextDecoder with latin1 support
global.TextDecoder = class TextDecoder {
  encoding: string;

  constructor(encoding: string = 'utf-8') {
    this.encoding = encoding.toLowerCase();
  }

  decode(arr?: Uint8Array | ArrayBuffer): string {
    if (!arr) return '';
    const uint8Array = arr instanceof Uint8Array ? arr : new Uint8Array(arr);

    // Support latin1 (required by ExcelJS)
    if (this.encoding === 'latin1' || this.encoding === 'iso-8859-1') {
      // Latin1 is a single-byte encoding where each byte maps directly to a character
      let str = '';
      for (let i = 0; i < uint8Array.length; i++) {
        str += String.fromCharCode(uint8Array[i]);
      }
      return str;
    }

    // Support ASCII
    if (this.encoding === 'ascii') {
      let str = '';
      for (let i = 0; i < uint8Array.length; i++) {
        str += String.fromCharCode(uint8Array[i] & 0x7f);
      }
      return str;
    }

    // UTF-8 decoding (simplified - works for most cases)
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

export {};
