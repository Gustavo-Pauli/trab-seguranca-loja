import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { writeVault, unlockVault } from '../shared/protocol/vault.js';
import { passwordPrompt } from './password.js';

const args = process.argv.slice(2);
const binIndex = args.indexOf('--bin');
if (binIndex >= 0) {
  const source = args[binIndex + 1];
  if (!source || !existsSync(source))
    throw new Error('Informe --bin seguido do caminho da base DB5.');
  mkdirSync('data', { recursive: true });
  const target = resolve('data/IP2LOCATION-LITE-DB5.BIN');
  if (!existsSync(target)) {
    copyFileSync(source, target);
    console.log('DB5 copiada para data/.');
  }
}
if (!existsSync(process.env.IP2LOCATION_BIN ?? 'data/IP2LOCATION-LITE-DB5.BIN'))
  throw new Error('Base ausente. Use pnpm run setup --bin "caminho da DB5.BIN".');
const directory = resolve(process.env.DATA_DIR ?? '.data');
const shop = resolve(directory, 'loja-segredo.json'),
  gateway = resolve(directory, 'gateway-segredo.json');
if (existsSync(shop) !== existsSync(gateway))
  throw new Error(
    'Existe apenas um cofre. Preserve os arquivos e confira o provisionamento antes de continuar.',
  );
const password = await passwordPrompt('Senha de desbloqueio dos cofres (mín. 12 caracteres): ');
try {
  if (password.toString('utf8').length < 12) throw new Error('Use ao menos 12 caracteres.');
  if (existsSync(shop)) {
    const a = await unlockVault(shop, password, 'shop'),
      b = await unlockVault(gateway, password, 'gateway');
    try {
      if (!timingSafeEqual(a, b)) throw new Error('Os cofres não têm o mesmo segredo.');
    } finally {
      a.fill(0);
      b.fill(0);
    }
    console.log('Cofres existentes conferidos; banco e segredos preservados.');
  } else {
    const confirmation = await passwordPrompt('Repita a senha: ');
    try {
      if (password.length !== confirmation.length || !timingSafeEqual(password, confirmation))
        throw new Error('Senhas diferentes.');
    } finally {
      confirmation.fill(0);
    }
    const shared = randomBytes(32);
    try {
      await writeVault(shop, password, shared, 'shop');
      await writeVault(gateway, password, shared, 'gateway');
    } finally {
      shared.fill(0);
    }
    console.log('Dois cofres independentes criados. Guarde a senha de desbloqueio.');
  }
} finally {
  password.fill(0);
}
