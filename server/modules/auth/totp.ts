import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { TOTP_PERIOD_SECONDS } from '../../../shared/protocol/limits.js';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
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

  if (bits > 0) {
    result += BASE32[(acc << (5 - bits)) & 31];
  }

  return result;
}

function fromBase32(value: string): Buffer {
  let bits = 0;
  let acc = 0;
  const bytes: number[] = [];

  for (const character of value.toUpperCase().replace(/=+$/g, '')) {
    const digit = BASE32.indexOf(character);

    if (digit === -1) {
      throw new Error('Segredo Base32 inválido');
    }

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

// HOTP (RFC 4226): calcula o código a partir do segredo e de um contador.
export function codeForCounter(secretBase32: string, counter: number): string {
  const secret = fromBase32(secretBase32);
  const input = Buffer.alloc(8);
  input.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac('sha1', secret).update(input).digest();
  // O último byte indica onde extrair os 31 bits usados no código.
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

// Devolve o contador do código aceito, ou null quando nenhum código bate.
export function verifyTotp(secret: string, code: string, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) {
    return null;
  }

  const current = Math.floor(now / 1000 / TOTP_PERIOD_SECONDS);

  // Testa o intervalo anterior, o atual e o seguinte para tolerar diferenças de relógio.
  for (const delta of [-1, 0, 1]) {
    const counter = current + delta;

    if (counter < 0) {
      continue;
    }

    const expected = Buffer.from(codeForCounter(secret, counter), 'utf8');
    const submitted = Buffer.from(code, 'utf8');

    if (timingSafeEqual(expected, submitted)) {
      // O login grava este contador no banco para impedir seu reuso.
      return counter;
    }
  }

  return null;
}

// Monta o endereço que vai no QR lido pelo aplicativo autenticador.
export function createOtpAuthUri(email: string, secret: string): string {
  const issuer = 'Loja Segura INE5680';
  const label = encodeURIComponent(`${issuer}:${email}`);

  return (
    `otpauth://totp/${label}?secret=${encodeURIComponent(secret)}` +
    `&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${TOTP_PERIOD_SECONDS}`
  );
}
