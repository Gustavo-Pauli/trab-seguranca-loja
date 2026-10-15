import QRCode from 'qrcode';
import { randomUUID } from 'node:crypto';
import { HttpError } from '../../lib/http-error.js';
import { getUserByEmail, insertUser } from './auth.repository.js';
import type { UserRow } from './auth.repository.js';
import { decryptTotp, encryptTotp, hashPassword, verifyPassword } from './credentials.js';
import { createOtpAuthUri, generateTotpSecret } from './totp.js';
import { newChallenge } from './challenges.js';

export async function registerUser(name: string, email: string, password: string, ip: string) {
  const registration = validateRegistration(name, email, password);
  const { userId, secret } = await createAccount(registration.name, registration.email, password);

  return prepareChallenge(userId, registration.email, secret, true, ip);
}

// Confere a senha e prepara o TOTP; a sessão ainda não é criada aqui.
export async function loginWithPassword(email: string, password: string, ip: string) {
  const user = getUserByEmail(email.trim().toLowerCase());
  const passwordValid =
    user && (await verifyPassword(password, user.password_salt, user.password_hash));

  if (!user || !passwordValid) {
    throw new HttpError(401, 'E-mail ou senha inválidos.');
  }

  const secret = await readTotpSecret(user, password);

  return prepareChallenge(user.id, user.email, secret, user.totp_enabled === 0, ip);
}

// Prepara a etapa TOTP e inclui o QR quando o autenticador ainda precisa ser configurado.
async function prepareChallenge(
  userId: string,
  email: string,
  secret: string,
  enroll: boolean,
  ip: string,
) {
  const payload = {
    step: 'totp' as const,
    mode: enroll ? ('enroll' as const) : ('login' as const),
    challengeToken: newChallenge(userId, secret, enroll ? 'enroll' : 'login', ip),
    message: enroll ? 'Configure seu autenticador.' : 'Informe o código do seu autenticador.',
  };

  if (!enroll) {
    return payload;
  }

  return {
    ...payload,
    qrCodeDataUrl: await QRCode.toDataURL(createOtpAuthUri(email, secret), {
      margin: 2,
      width: 220,
    }),
    manualSecret: secret,
  };
}

function validateRegistration(name: string, email: string, password: string) {
  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const validName = normalizedName.length >= 2 && normalizedName.length <= 80;
  const validEmail =
    normalizedEmail.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const validPassword = password.length >= 8 && password.length <= 128;

  if (!validName || !validEmail || !validPassword) {
    throw new HttpError(400, 'Use nome (2-80), e-mail válido e senha (8-128 caracteres).');
  }

  return { name: normalizedName, email: normalizedEmail };
}

// Salva o hash da senha e a semente TOTP cifrada, deixando a ativação pendente.
async function createAccount(name: string, email: string, password: string) {
  if (getUserByEmail(email)) {
    throw new HttpError(409, 'Este e-mail já está cadastrado. Entre com sua senha para continuar.');
  }

  const userId = randomUUID();
  const secret = generateTotpSecret();
  const [passwordData, encryptedTotp] = await Promise.all([
    hashPassword(password),
    encryptTotp(secret, password, userId),
  ]);

  try {
    insertUser({
      id: userId,
      name,
      email,
      password_salt: passwordData.salt,
      password_hash: passwordData.hash,
      totp_salt: encryptedTotp.salt,
      totp_ciphertext: encryptedTotp.ciphertext,
      totp_tag: encryptedTotp.tag,
      totp_enabled: 0,
      totp_last_counter: -1,
      created_at: Date.now(),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE')) {
      throw new HttpError(409, 'Este e-mail já está cadastrado.');
    }

    throw error;
  }

  return { userId, secret };
}

// Usa a senha para recuperar a semente TOTP cifrada no cadastro.
async function readTotpSecret(user: UserRow, password: string): Promise<string> {
  try {
    return await decryptTotp(
      {
        salt: user.totp_salt,
        ciphertext: user.totp_ciphertext,
        tag: user.totp_tag,
      },
      password,
      user.id,
    );
  } catch {
    throw new HttpError(
      500,
      'Não foi possível recuperar o TOTP. Verifique a integridade dos dados.',
    );
  }
}
