import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PERIOD_SECONDS = 30;
const DIGITS = 6;

function toBase32(bytes: Buffer): string {
  let bits = 0;
  let acc = 0;
  let result = '';
  for (const byte of bytes) {
    acc = (acc << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32[(acc >>> bits) & 31];
    }
  }
  if (bits > 0) result += BASE32[(acc << (5 - bits)) & 31];
  return result;
}

function fromBase32(value: string): Buffer {
  let bits = 0;
  let acc = 0;
  const bytes: number[] = [];
  for (const character of value.toUpperCase().replace(/=+$/g, '')) {
    const digit = BASE32.indexOf(character);
    if (digit === -1) throw new Error('Segredo Base32 inválido');
    acc = (acc << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acc >>> bits) & 255);
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  return toBase32(randomBytes(20));
}

// HOTP (RFC 4226); verifyTotp usa o tempo como contador (RFC 6238).
export function codeForCounter(secretBase32: string, counter: number): string {
  const secret = fromBase32(secretBase32);
  const input = Buffer.alloc(8);
  input.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', secret).update(input).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

/** Retorna o contador aceito, para impedir a reutilização do mesmo TOTP. */
export function verifyTotp(secret: string, code: string, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const current = Math.floor(now / 1000 / PERIOD_SECONDS);
  for (const delta of [-1, 0, 1]) {
    const counter = current + delta;
    if (counter < 0) continue;
    const expected = Buffer.from(codeForCounter(secret, counter), 'utf8');
    const submitted = Buffer.from(code, 'utf8');
    if (timingSafeEqual(expected, submitted)) return counter;
  }
  return null;
}

export function createOtpAuthUri(email: string, secret: string): string {
  const issuer = 'Loja Segura INE5680';
  const label = encodeURIComponent(`${issuer}:${email}`);
  return (
    `otpauth://totp/${label}?secret=${encodeURIComponent(secret)}` +
    `&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
  );
}
