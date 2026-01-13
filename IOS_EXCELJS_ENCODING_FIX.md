# iOS ExcelJS Encoding Fix

## Issue

When running the app on iOS Expo Go, the following error occurred:

```
[runtime not ready]: RangeError: Unknown encoding: latin1 (normalized: latin1)
```

## Root Cause

The `exceljs` library (v4.4.0) uses `TextDecoder` with "latin1" encoding for Excel file parsing. However, React Native's Hermes JavaScript engine **does not support the "latin1" encoding** natively. This encoding is only available in Node.js and some browsers, but not in mobile JavaScript environments.

## Solution

Created a polyfill (`frontend/utils/textEncodingPolyfill.ts`) that provides:

1. **TextEncoder** - Converts strings to byte arrays
2. **TextDecoder** - Converts byte arrays to strings with support for:
   - `utf-8` (default)
   - `latin1` / `iso-8859-1` (required by ExcelJS)
   - `ascii`

### Implementation

**Polyfill File:** `frontend/utils/textEncodingPolyfill.ts`

```typescript
// Polyfill for TextDecoder with latin1 support
global.TextDecoder = class TextDecoder {
  encoding: string;

  constructor(encoding: string = "utf-8") {
    this.encoding = encoding.toLowerCase();
  }

  decode(arr: Uint8Array | ArrayBuffer): string {
    const uint8Array = arr instanceof Uint8Array ? arr : new Uint8Array(arr);

    if (this.encoding === "latin1" || this.encoding === "iso-8859-1") {
      // Latin1: single-byte encoding (0-255)
      let str = "";
      for (let i = 0; i < uint8Array.length; i++) {
        str += String.fromCharCode(uint8Array[i]);
      }
      return str;
    }
    // ... utf-8 fallback
  }
};
```

**App Entry:** `frontend/App.tsx`

```typescript
// CRITICAL: Import polyfill FIRST (before any other imports)
import "./utils/textEncodingPolyfill";
```

## Files Modified

### Created

- ✅ `frontend/utils/textEncodingPolyfill.ts` - TextDecoder/TextEncoder polyfill

### Modified

- ✅ `frontend/App.tsx` - Added polyfill import at top

## Testing

1. **Before Fix:**

   - App crashed on iOS Expo Go with `RangeError: Unknown encoding: latin1`
   - Error originated from ExcelJS library loading

2. **After Fix:**
   - ✅ App loads successfully on iOS
   - ✅ ExcelJS export functionality works in InstructorEarningsOverviewScreen
   - ✅ No encoding errors in console
   - ✅ Web compatibility maintained

## Technical Notes

### Latin1 (ISO-8859-1) Encoding

- **Character Range:** 0-255 (single byte per character)
- **Usage:** Legacy Excel files, Western European languages
- **Conversion:** Each byte directly maps to a Unicode code point (0-255)

### Why Hermes Lacks Latin1

- React Native's Hermes engine prioritizes performance and binary size
- Only includes most common encodings (UTF-8, UTF-16)
- Rare/legacy encodings require polyfills

### Alternative Solutions Considered

1. ❌ **Remove ExcelJS** - Would lose Excel export functionality
2. ❌ **Platform-specific code** - Complex, duplicates logic
3. ✅ **Polyfill** - Clean, minimal, maintains all features

## Related Libraries

- **ExcelJS v4.4.0** - Excel file generation (uses latin1 internally)
- **jsPDF v4.0.0** - PDF generation (no encoding issues)

## References

- [TextDecoder MDN](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder)
- [ISO-8859-1 Encoding](https://en.wikipedia.org/wiki/ISO/IEC_8859-1)
- [ExcelJS GitHub](https://github.com/exceljs/exceljs)

---

**Status:** ✅ Fixed (Jan 13, 2026)
**Platforms Tested:** iOS (Expo Go), Web, Android
**Impact:** Zero - maintains backward compatibility
