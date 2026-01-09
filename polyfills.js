import 'react-native-url-polyfill/auto';
import 'fast-text-encoding';

// Force fallback TextDecoder/TextEncoder if they are missing or broken
// This fixes "Cannot read property 'decode' of undefined" and "TextDecoder is not defined"

const createFallbackTextDecoder = () =>
  class TextDecoder {
    constructor(label, options) {
        this.encoding = 'utf-8';
    }
    decode(buffer) {
      if (!buffer) return "";
      const bytes =
        buffer instanceof ArrayBuffer
          ? new Uint8Array(buffer)
          : ArrayBuffer.isView(buffer)
          ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
          : null;

      if (!bytes) return typeof buffer === "string" ? buffer : String(buffer);

      let str = "";
      for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
      try {
        return decodeURIComponent(escape(str));
      } catch {
        return str;
      }
    }
  };

const createFallbackTextEncoder = () =>
  class TextEncoder {
    constructor() {
        this.encoding = 'utf-8';
    }
    encode(str) {
      const s = str == null ? "" : String(str);
      const utf8 = unescape(encodeURIComponent(s));
      const out = new Uint8Array(utf8.length);
      for (let i = 0; i < utf8.length; i++) out[i] = utf8.charCodeAt(i);
      return out;
    }
  };

if (typeof global.TextDecoder === 'undefined' || typeof global.TextDecoder.prototype.decode !== 'function') {
    global.TextDecoder = createFallbackTextDecoder();
}

if (typeof global.TextEncoder === 'undefined' || typeof global.TextEncoder.prototype.encode !== 'function') {
    global.TextEncoder = createFallbackTextEncoder();
}
