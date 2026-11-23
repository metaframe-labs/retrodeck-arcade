/**
 * Pure TypeScript Base64 & Hex ROM codecs.
 * Zero dependency on Node Buffer or browser atob/btoa — works identically on
 * React Native (Hermes/JSC), Web, and Node.
 */

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = new Uint8Array(256).fill(255);
for (let i = 0; i < B64_CHARS.length; i++) {
  B64_LOOKUP[B64_CHARS.charCodeAt(i)] = i;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;

    const triplet = (b0 << 16) | (b1 << 8) | b2;
    out += B64_CHARS[(triplet >> 18) & 0x3f];
    out += B64_CHARS[(triplet >> 12) & 0x3f];
    out += i + 1 < len ? B64_CHARS[(triplet >> 6) & 0x3f] : '=';
    out += i + 2 < len ? B64_CHARS[triplet & 0x3f] : '=';
  }
  return out;
}

export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  if (clean.length === 0) return new Uint8Array(0);

  let padding = 0;
  if (clean.endsWith('==')) padding = 2;
  else if (clean.endsWith('=')) padding = 1;

  const byteLen = Math.floor((clean.length * 3) / 4) - padding;
  const out = new Uint8Array(Math.max(0, byteLen));

  let outIdx = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = B64_LOOKUP[clean.charCodeAt(i)] ?? 0;
    const c1 = B64_LOOKUP[clean.charCodeAt(i + 1)] ?? 0;
    const c2 = clean[i + 2] === '=' ? 0 : (B64_LOOKUP[clean.charCodeAt(i + 2)] ?? 0);
    const c3 = clean[i + 3] === '=' ? 0 : (B64_LOOKUP[clean.charCodeAt(i + 3)] ?? 0);

    const triplet = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3;
    if (outIdx < out.length) out[outIdx++] = (triplet >> 16) & 0xff;
    if (outIdx < out.length) out[outIdx++] = (triplet >> 8) & 0xff;
    if (outIdx < out.length) out[outIdx++] = triplet & 0xff;
  }
  return out;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  const len = Math.floor(clean.length / 2);
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToHex(bytes: Uint8Array, separator = ' '): string {
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    parts.push(bytes[i].toString(16).toUpperCase().padStart(2, '0'));
  }
  return parts.join(separator);
}

/**
 * Smart decoder: accepts either Base64 or raw Hex string.
 */
export function decodeRomInput(input: string): Uint8Array {
  const trimmed = input.trim();
  if (!trimmed) return new Uint8Array(0);
  // If prefixed with 0x or purely hex pairs with spaces/newlines
  const withoutSpaces = trimmed.replace(/\s+/g, '');
  if (/^0x/i.test(withoutSpaces)) {
    return hexToBytes(withoutSpaces.slice(2));
  }
  if (/^[0-9a-fA-F]+$/.test(withoutSpaces) && withoutSpaces.length % 2 === 0 && trimmed.includes(' ')) {
    return hexToBytes(withoutSpaces);
  }
  return base64ToBytes(trimmed);
}
