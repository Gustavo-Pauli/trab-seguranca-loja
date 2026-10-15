import { pbkdf2 } from 'node:crypto';
import { promisify } from 'node:util';
import type { Purpose } from './types.js';

const derive = promisify(pbkdf2);
const ITERATIONS = 210_000;

// PBKDF2 gera 44 bytes: 32 para a chave AES e 12 para o IV.
export async function material(secret: Buffer, salt: Buffer, purpose: Purpose): Promise<Buffer> {
  // O prefixo faz cada finalidade derivar uma chave e um IV diferentes.
  return derive(
    secret,
    Buffer.concat([Buffer.from(`loja-v1:${purpose}:`), salt]),
    ITERATIONS,
    44,
    'sha512',
  );
}
