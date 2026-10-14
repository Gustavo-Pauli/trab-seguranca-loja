import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
const COST = { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 } as const;
function scrypt(
  password: string,
  salt: Buffer,
  length: number,
  options: typeof COST,
): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCallback(password, salt, length, options, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}

/** Hash derivado e salt são persistidos; a senha original jamais é armazenada. */
export async function hashPassword(password: string): Promise<{ salt: string; hash: string }> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64, COST)) as Buffer;
  try {
    return { salt: salt.toString('base64'), hash: derived.toString('base64') };
  } finally {
    derived.fill(0);
  }
}

export async function verifyPassword(
  password: string,
  saltB64: string,
  hashB64: string,
): Promise<boolean> {
  const expected = Buffer.from(hashB64, 'base64');
  const salt = Buffer.from(saltB64, 'base64');
  if (expected.length !== 64 || salt.length !== 16) return false;
  const actual = await scrypt(password, salt, 64, COST);
  try {
    return timingSafeEqual(expected, actual);
  } finally {
    actual.fill(0);
  }
}

export interface EncryptedTotp {
  salt: string;
  ciphertext: string;
  tag: string;
}

/**
 * Protege o segredo TOTP sob uma chave derivada da senha do usuário.
 * O material derivado inclui a chave AES (32 bytes) e o IV (12 bytes).
 * Cada usuário recebe um salt independente, gerado com CSPRNG.
 * É executada uma única cifragem por salt; recriptografar exige salt novo.
 */
export async function encryptTotp(
  secret: string,
  password: string,
  userId: string,
): Promise<EncryptedTotp> {
  const salt = randomBytes(16);
  const derived = (await scrypt(`totp:${password}`, salt, 44, COST)) as Buffer;
  try {
    const cipher = createCipheriv(
      'aes-256-gcm',
      derived.subarray(0, 32),
      derived.subarray(32, 44),
      { authTagLength: 16 },
    );
    cipher.setAAD(Buffer.from(`user:${userId}`));
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    return {
      salt: salt.toString('base64'),
      ciphertext: encrypted.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
    };
  } finally {
    derived.fill(0);
  }
}

export async function decryptTotp(
  data: EncryptedTotp,
  password: string,
  userId: string,
): Promise<string> {
  const salt = Buffer.from(data.salt, 'base64'),
    tag = Buffer.from(data.tag, 'base64');
  if (salt.length !== 16 || tag.length !== 16) throw new Error('Parâmetros TOTP inválidos');
  const derived = await scrypt(`totp:${password}`, salt, 44, COST);
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      derived.subarray(0, 32),
      derived.subarray(32, 44),
      { authTagLength: 16 },
    );
    decipher.setAAD(Buffer.from(`user:${userId}`));
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(Buffer.from(data.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } finally {
    derived.fill(0);
  }
}
