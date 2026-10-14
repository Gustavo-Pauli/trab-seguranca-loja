import { pbkdf2 } from 'node:crypto';
import { promisify } from 'node:util';
import type { Purpose } from './types.js';
const derive = promisify(pbkdf2);
const ITERATIONS = 210_000;

/** Ambos os processos recalculam 32 bytes de chave e 12 de IV do segredo + salt novo.
 * A separação de domínio impede usar uma resposta como pagamento ou trocar cofres. */
export async function material(secret: Buffer, salt: Buffer, purpose: Purpose): Promise<Buffer> {
  return derive(
    secret,
    Buffer.concat([Buffer.from(`loja-v1:${purpose}:`), salt]),
    ITERATIONS,
    44,
    'sha512',
  );
}
