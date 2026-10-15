import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { seal, open } from './encryption.js';
import { decode } from './encoding.js';

export async function writeVault(
  path: string,
  password: Buffer,
  sharedSecret: Buffer,
  role: 'shop' | 'gateway',
): Promise<void> {
  const envelope = await seal(
    { sharedSecret: sharedSecret.toString('base64') },
    password,
    `vault:${role}`,
  );
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(envelope, null, 2), { flag: 'wx', mode: 0o600 });
}

export async function unlockVault(
  path: string,
  password: Buffer,
  role: 'shop' | 'gateway',
): Promise<Buffer> {
  const payload = await open<{ sharedSecret: string }>(
    JSON.parse(readFileSync(path, 'utf8')),
    password,
    `vault:${role}`,
  );

  return decode(payload.sharedSecret, 32);
}

// Abre os dois cofres e confere se guardam o mesmo segredo compartilhado.
export async function verifyVaultPair(shopPath: string, gatewayPath: string, password: Buffer) {
  const shopSecret = await unlockVault(shopPath, password, 'shop');
  let gatewaySecret: Buffer | undefined;

  try {
    gatewaySecret = await unlockVault(gatewayPath, password, 'gateway');

    if (!timingSafeEqual(shopSecret, gatewaySecret)) {
      throw new Error('Cofres incompatíveis.');
    }
  } finally {
    shopSecret.fill(0);
    gatewaySecret?.fill(0);
  }
}

export async function secretFromStdin(path: string, role: 'shop' | 'gateway'): Promise<Buffer> {
  // Recebe pelo stdin a senha enviada pelo processo de inicialização.
  let password = Buffer.alloc(0);

  for await (const chunk of process.stdin) {
    password = Buffer.concat([password, Buffer.from(chunk)]);

    if (password.length > 1024) {
      throw new Error('Senha de desbloqueio muito longa.');
    }
  }

  try {
    return await unlockVault(path, password, role);
  } catch {
    throw new Error(
      `Não foi possível abrir o cofre ${role}. Execute pnpm run setup e confira a senha de desbloqueio.`,
    );
  } finally {
    password.fill(0);
  }
}
