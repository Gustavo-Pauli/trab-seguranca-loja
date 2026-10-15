import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { material } from './key-derivation.js';
import { decode } from './encoding.js';
import type { Envelope, Purpose } from './types.js';

// Cifra o JSON com AES-GCM e monta o envelope com salt, texto cifrado e tag.
export async function seal(value: unknown, secret: Buffer, purpose: Purpose): Promise<Envelope> {
  const salt = randomBytes(32);
  const bytes = await material(secret, salt, purpose);

  try {
    const cipher = createCipheriv('aes-256-gcm', bytes.subarray(0, 32), bytes.subarray(32), {
      authTagLength: 16,
    });
    cipher.setAAD(Buffer.from(`loja-v1:${purpose}:${salt.toString('base64')}`));

    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(value), 'utf8'),
      cipher.final(),
    ]);

    return {
      version: 1,
      salt: salt.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
    };
  } finally {
    bytes.fill(0);
  }
}

// Abre o envelope e só devolve o JSON se a tag GCM for válida.
export async function open<T>(input: unknown, secret: Buffer, purpose: Purpose): Promise<T> {
  const envelope = input as Envelope | null;

  if (!envelope || envelope.version !== 1) {
    throw new Error('INVALID_ENVELOPE');
  }

  const salt = decode(envelope.salt, 32);
  const tag = decode(envelope.tag, 16);
  const ciphertext = decode(envelope.ciphertext);

  if (ciphertext.length > 32_000) {
    throw new Error('INVALID_ENVELOPE');
  }

  const bytes = await material(secret, salt, purpose);

  try {
    const decipher = createDecipheriv('aes-256-gcm', bytes.subarray(0, 32), bytes.subarray(32), {
      authTagLength: 16,
    });
    decipher.setAAD(Buffer.from(`loja-v1:${purpose}:${envelope.salt}`));
    decipher.setAuthTag(tag);

    // final() verifica a tag; só então o conteúdo é convertido de JSON.
    return JSON.parse(
      Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8'),
    ) as T;
  } finally {
    bytes.fill(0);
  }
}
