import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import Database from 'better-sqlite3';
import { createServer } from 'node:http';
import { writeVault } from '../shared/protocol/vault.js';
import { seal, open } from '../shared/protocol/encryption.js';
import type { Envelope } from '../shared/protocol/types.js';
import { codeForCounter, verifyTotp } from '../server/modules/auth/totp.js';
import type { Payment, PaymentResult } from '../shared/protocol/types.js';

const bin = resolve(process.env.IP2LOCATION_BIN ?? 'data/IP2LOCATION-LITE-DB5.BIN');

if (!existsSync(bin)) {
  throw new Error('Base DB5 ausente. Execute pnpm run setup --bin "caminho da DB5.BIN".');
}

const directory = resolve(`.data/test-${Date.now()}`);

mkdirSync(directory, { recursive: true });

const password = randomBytes(32);
const shared = randomBytes(32);
const accountPassword = randomBytes(24).toString('base64');

await writeVault(resolve(directory, 'loja-segredo.json'), password, shared, 'shop');
await writeVault(resolve(directory, 'gateway-segredo.json'), password, shared, 'gateway');

const env = {
  ...process.env,
  PORT: '3301',
  GATEWAY_PORT: '4400',
  GATEWAY_URL: 'http://127.0.0.1:4400',
  DATA_DIR: directory,
  IP2LOCATION_BIN: bin,
  DEMO_MODE: 'true',
  DEMO_IP: '150.162.60.21',
};
const children = new Set<ChildProcess>();
const logs: string[] = [];

function start(file: string, overrides: Record<string, string> = {}, unlock = password) {
  const child = spawn(process.execPath, ['--import', 'tsx', file], {
    env: { ...env, ...overrides },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });
  children.add(child);
  child.stdout!.on('data', (chunk) => logs.push(String(chunk)));
  child.stderr!.on('data', (chunk) => logs.push(String(chunk)));
  child.once('exit', () => children.delete(child));
  child.stdin!.end(unlock);

  return child;
}

async function stop(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  await new Promise<void>((resolveStop) => {
    child.once('exit', () => resolveStop());
    child.kill();
  });
}

async function ready(url: string, child: ChildProcess) {
  for (let tries = 0; tries < 100; tries++) {
    if (child.exitCode !== null) {
      throw new Error(`Servidor falhou: ${logs.slice(-6).join('')}`);
    }

    try {
      if ((await fetch(url)).ok) {
        return;
      }
    } catch {}

    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }

  throw new Error(`Timeout: ${url}\n${logs.slice(-6).join('')}`);
}

const evidence: { name: string; status: number | string; details: unknown }[] = [];

function record(name: string, status: number | string, details: unknown) {
  evidence.push({ name, status, details });
  console.log(`OK ${name} (${status})`);
}

let cookie = '';

async function request(
  path: string,
  body?: unknown,
  authenticated = true,
  headers: Record<string, string> = {},
) {
  const response = await fetch(`http://127.0.0.1:3301/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(authenticated && cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  return {
    status: response.status,
    data: await response.json(),
    setCookie: response.headers.get('set-cookie'),
  };
}

async function paymentRequest(envelope: Envelope) {
  const response = await fetch('http://127.0.0.1:4400/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(envelope),
  });
  const wire = await response.json();
  const data = 'version' in wire ? await open<PaymentResult>(wire, shared, 'response') : wire;

  return { status: response.status, data, wire };
}

let shop: ChildProcess | undefined;
let gateway: ChildProcess | undefined;
let completed = false;

try {
  const vectorSecret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  [
    '755224',
    '287082',
    '359152',
    '969429',
    '338314',
    '254676',
    '287922',
    '162583',
    '399871',
    '520489',
  ].forEach((code, counter) => assert.equal(codeForCounter(vectorSecret, counter), code));
  assert.equal(codeForCounter(vectorSecret, 1), '287082'); // RFC 6238 SHA1 t=59 mod 10^6.
  record('Vetores HOTP RFC 4226 e TOTP RFC 6238', 'PASS', '10 contadores HOTP e TOTP em t=59 s');
  shop = start('server/index.ts');
  gateway = start('gateway/index.ts');
  await Promise.all([
    ready('http://127.0.0.1:3301/api/health', shop),
    ready('http://127.0.0.1:4400/health', gateway),
  ]);

  const email = `teste-${randomUUID()}@example.test`;
  const registration = await request(
    '/auth/register',
    { name: 'Teste Funcional', email, password: accountPassword },
    false,
  );
  assert.equal(registration.status, 201);
  assert.match(registration.data.qrCodeDataUrl, /^data:image\/png;base64,/);
  assert.equal(registration.setCookie, null);

  const secret = registration.data.manualSecret as string;
  record('Cadastro real e QR code', registration.status, {
    mode: registration.data.mode,
    qrPng: true,
    sessionCreated: false,
  });

  const wrongPassword = await request('/auth/login', { email, password: 'senha-incorreta' }, false);
  assert.equal(wrongPassword.status, 401);
  assert.equal(wrongPassword.setCookie, null);
  record('Senha incorreta', wrongPassword.status, wrongPassword.data);

  let invalid = '000000';

  while (verifyTotp(secret, invalid) !== null) {
    invalid = String(Number(invalid) + 1).padStart(6, '0');
  }

  const challengeToken = registration.data.challengeToken;
  const limitedLogin = await request('/auth/login', { email, password: accountPassword }, false);
  assert.equal(limitedLogin.status, 200);

  for (let attempt = 0; attempt < 5; attempt++) {
    const rejected = await request(
      '/auth/verify-totp',
      {
        challengeToken: limitedLogin.data.challengeToken,
        code: invalid,
      },
      false,
    );
    assert.equal(rejected.status, 401);
    assert.equal(rejected.setCookie, null);
  }

  const exhausted = await request(
    '/auth/verify-totp',
    {
      challengeToken: limitedLogin.data.challengeToken,
      code: codeForCounter(secret, Math.floor(Date.now() / 30_000)),
    },
    false,
  );
  assert.equal(exhausted.status, 401);
  assert.match(exhausted.data.error, /Desafio expirado/);
  assert.equal(exhausted.setCookie, null);
  record('Desafio inutilizado após cinco códigos incorretos', exhausted.status, {
    attempts: 5,
    validCodeAfterLimitRejected: true,
    sessionCreated: false,
  });

  const wrongTotp = await request('/auth/verify-totp', { challengeToken, code: invalid }, false);
  assert.equal(wrongTotp.status, 401);
  assert.equal(wrongTotp.setCookie, null);
  record('Ataque C: TOTP incorreto de seis dígitos', wrongTotp.status, {
    ...wrongTotp.data,
    codeSubmitted: invalid,
    sessionCreated: false,
  });
  assert.equal((await request('/auth/me', undefined, false)).status, 401);

  const counter = Math.floor(Date.now() / 30_000);
  const validCode = codeForCounter(secret, counter);
  const verified = await request('/auth/verify-totp', { challengeToken, code: validCode }, false);
  assert.equal(verified.status, 200);
  assert.match(verified.setCookie!, /HttpOnly/i);
  assert.match(verified.setCookie!, /SameSite=Strict/i);
  cookie = verified.setCookie!.split(';')[0];
  assert.equal(verified.data.context.location.country, 'BR');
  assert.equal(verified.data.context.location.ip, '150.162.60.21');
  record('TOTP válido e contexto IP2Location', verified.status, verified.data.context);

  const loginChallenge = await request('/auth/login', { email, password: accountPassword }, false);
  assert.equal(loginChallenge.status, 200);
  assert.equal(loginChallenge.data.manualSecret, undefined);

  const reused = await request(
    '/auth/verify-totp',
    { challengeToken: loginChallenge.data.challengeToken, code: validCode },
    false,
  );
  assert.equal(reused.status, 401);
  record('Reutilização de TOTP', reused.status, reused.data);

  const catalog = await request('/products');
  assert.equal(catalog.data.products.length, 4);
  record('Catálogo autenticado', catalog.status, { count: 4 });

  const noSession = await request(
    '/checkout',
    { items: [{ product_id: 'P01', quantity: 2 }] },
    false,
  );
  assert.equal(noSession.status, 401);
  record('Checkout sem sessão', noSession.status, noSession.data);

  const falseLocation = { country: 'XX', region: 'Falsa', city: 'Inventada' };
  const context = await request('/context', { location: falseLocation, ip: '8.8.8.8' }, true, {
    'X-Forwarded-For': '8.8.8.8',
  });
  assert.equal(context.data.observed.ip, '150.162.60.21');
  assert.equal(context.data.observed.country, 'BR');
  assert.equal(context.data.clientDeclarationIgnored, true);
  record('Ataque D: localização, IP e header falsificados', context.status, {
    sent: falseLocation,
    forwardedFor: '8.8.8.8',
    response: context.data,
  });

  const badQuantity = await request('/checkout', { items: [{ product_id: 'P01', quantity: -1 }] });
  assert.equal(badQuantity.status, 400);
  record('Quantidade inválida', badQuantity.status, badQuantity.data);

  const checkout = await request('/checkout', {
    items: [{ product_id: 'P01', quantity: 2, unit_price: 1 }],
    total: 2,
    user_id: 'outro',
    location: falseLocation,
  });
  assert.equal(checkout.status, 200);
  assert.equal(checkout.data.status, 'APPROVED');
  assert.equal(checkout.data.total_cents, 10000);

  const history = await request('/orders');
  assert.equal(history.status, 200);

  const savedOrder = history.data.orders[0];
  assert.equal(savedOrder.order_id, checkout.data.order_id);
  assert.equal(savedOrder.id, savedOrder.order_id);
  assert.equal(savedOrder.user_id, verified.data.user.id);
  assert.equal(savedOrder.total, 100);
  assert.equal(savedOrder.total_cents, 10000);
  assert.equal(savedOrder.items[0].quantity, 2);
  assert.equal(savedOrder.items[0].unit_price, 50);
  record('Compra real: preço, usuário e localização definidos no servidor', checkout.status, {
    payment: checkout.data,
    order: savedOrder,
  });

  const capture = await request('/demo/capture');
  assert.equal(capture.status, 200);

  const envelope = capture.data.envelope as Envelope;
  const payment = await open<Payment>(envelope, shared, 'payment');
  assert.equal(payment.amount, 100);
  assert.equal(payment.location.country, 'BR');
  assert.ok(!JSON.stringify(envelope).includes(payment.user_id));

  const replay = await paymentRequest(envelope);
  assert.equal(replay.status, 409);
  assert.equal(replay.data.reason, 'INVALID_NONCE');
  record('Ataque A: replay do envelope capturado exatamente', replay.status, {
    request: envelope,
    response: replay.data,
  });

  const tamper = await request('/demo/attack', { action: 'tamper' });
  assert.equal(tamper.status, 200);
  assert.equal(tamper.data.response.httpStatus, 400);
  assert.equal(tamper.data.response.result.reason, 'INVALID_AUTH_TAG');
  assert.notEqual(tamper.data.request.ciphertext, envelope.ciphertext);
  assert.equal(tamper.data.request.tag, envelope.tag);
  record(
    'Ataque B: R$ 100 → R$ 1000 no ciphertext (100 → 1e3)',
    tamper.data.response.httpStatus,
    tamper.data,
  );

  for (const [action, reason] of [
    ['expired', 'INVALID_TIMESTAMP'],
    ['inconsistent', 'INCONSISTENT_ORDER'],
  ]) {
    const result = await request('/demo/attack', { action });
    assert.equal(result.data.response.result.reason, reason);
    record(action, result.data.response.httpStatus, result.data.response.result);
  }

  const freshPayment = (changes: Partial<Payment> = {}): Payment => ({
    ...structuredClone(payment),
    order_id: `ORD-${randomUUID()}`,
    nonce: randomBytes(32).toString('hex'),
    timestamp: Math.floor(Date.now() / 1000),
    ...changes,
  });
  const future = await paymentRequest(
    await seal(freshPayment({ timestamp: Math.floor(Date.now() / 1000) + 300 }), shared, 'payment'),
  );
  assert.equal(future.data.reason, 'INVALID_TIMESTAMP');
  record('Timestamp futuro', future.status, future.data);

  const wrongAuth = freshPayment();
  wrongAuth.authorization.totp_verified = false as never;

  const unauthorized = await paymentRequest(await seal(wrongAuth, shared, 'payment'));
  assert.equal(unauthorized.data.reason, 'INVALID_TOTP');
  record('Gateway exige prova de 2FA', unauthorized.status, unauthorized.data);

  const noAuth = freshPayment();
  noAuth.authorization.authenticated = false as never;

  const unauthenticated = await paymentRequest(await seal(noAuth, shared, 'payment'));
  assert.equal(unauthenticated.data.reason, 'UNAUTHENTICATED');
  record('Gateway exige usuário autenticado', unauthenticated.status, unauthenticated.data);

  const paidAgain = await paymentRequest(
    await seal(freshPayment({ order_id: payment.order_id }), shared, 'payment'),
  );
  assert.equal(paidAgain.data.reason, 'ORDER_ALREADY_PAID');
  record('Mesmo pedido com nonce novo', paidAgain.status, paidAgain.data);

  const badContext = freshPayment();
  badContext.location.city = 'Inventada';

  const locationGateway = await paymentRequest(await seal(badContext, shared, 'payment'));
  assert.equal(locationGateway.data.reason, 'INVALID_CONTEXT');
  record('Gateway consulta novamente a base DB5', locationGateway.status, locationGateway.data);

  const concurrentEnvelope = await seal(freshPayment(), shared, 'payment');
  const concurrent = await Promise.all([
    paymentRequest(concurrentEnvelope),
    paymentRequest(concurrentEnvelope),
  ]);
  assert.equal(concurrent.filter((result) => result.data.status === 'APPROVED').length, 1);
  assert.equal(concurrent.filter((result) => result.data.reason === 'INVALID_NONCE').length, 1);
  record(
    'Mesmo nonce em duas requisições simultâneas',
    '200/409',
    concurrent.map(({ status, data }) => ({ status, data })),
  );

  const modifiedAad = await paymentRequest({
    ...envelope,
    salt: randomBytes(32).toString('base64'),
  });
  assert.equal(modifiedAad.data.reason, 'INVALID_AUTH_TAG');
  record('Salt/AAD adulterado', modifiedAad.status, modifiedAad.data);
  await stop(gateway);
  gateway = start('gateway/index.ts');
  await ready('http://127.0.0.1:4400/health', gateway);

  const replayRestart = await paymentRequest(envelope);
  assert.equal(replayRestart.data.reason, 'INVALID_NONCE');
  record('Replay após reiniciar gateway', replayRestart.status, replayRestart.data);
  await stop(shop);
  shop = start('server/index.ts');
  await ready('http://127.0.0.1:3301/api/health', shop);
  assert.equal((await request('/auth/me')).status, 200);
  assert.equal((await request('/orders')).data.orders[0].status, 'APPROVED');

  const persistedLogin = await request('/auth/login', { email, password: accountPassword }, false);
  assert.equal(persistedLogin.status, 200);
  assert.equal(persistedLogin.data.mode, 'login');

  // Usa o próximo contador aceito para não repetir o TOTP consumido antes do reinício.
  const loginCounter = Math.max(counter + 1, Math.floor(Date.now() / 30_000));
  const afterRestart = await request(
    '/auth/verify-totp',
    {
      challengeToken: persistedLogin.data.challengeToken,
      code: codeForCounter(secret, loginCounter),
    },
    false,
  );
  assert.equal(afterRestart.status, 200);
  cookie = afterRestart.setCookie!.split(';')[0];
  record('Cadastro, sessão, pedido e novo login persistem após reinício', afterRestart.status, {
    totpCounter: loginCounter,
    usedPlusOneWindow: true,
  });

  const logout = await request('/auth/logout', {});
  assert.equal(logout.status, 200);
  assert.equal((await request('/auth/me')).status, 401);
  record('Logout revoga sessão', logout.status, { meAfterLogout: 401 });

  const crossSite = await request('/auth/login', { email, password: accountPassword }, false, {
    Origin: 'https://site-externo.example',
  });
  assert.equal(crossSite.status, 403);
  record('Origem externa', crossSite.status, crossSite.data);
  await stop(shop);
  shop = start('server/index.ts', { DEMO_IP: '8.8.8.8' });
  await ready('http://127.0.0.1:3301/api/health', shop);

  const foreignChallenge = await request(
    '/auth/login',
    { email, password: accountPassword },
    false,
  );
  const blocked = await request(
    '/auth/verify-totp',
    {
      challengeToken: foreignChallenge.data.challengeToken,
      code: codeForCounter(secret, Math.floor(Date.now() / 30_000)),
    },
    false,
  );
  assert.equal(blocked.status, 403);
  assert.equal(blocked.data.reason, 'COUNTRY_CHANGED');
  assert.equal(blocked.setCookie, null);
  record('Mudança de país bloqueia login apesar de TOTP válido', blocked.status, blocked.data);
  await stop(shop);
  shop = start('server/index.ts', { DEMO_MODE: 'false', DEMO_IP: '' });
  await ready('http://127.0.0.1:3301/api/health', shop);

  const noDemo = await request('/demo/capture', undefined, false);
  assert.equal(noDemo.status, 404);
  record('Rotas de demonstração inexistentes no modo normal', noDemo.status, 'HTTP 404');

  const localRegister = await request(
    '/auth/register',
    { name: 'Teste Local', email: 'local@example.test', password: accountPassword },
    false,
  );
  assert.equal(localRegister.status, 201);

  const localVerified = await request(
    '/auth/verify-totp',
    {
      challengeToken: localRegister.data.challengeToken,
      code: codeForCounter(localRegister.data.manualSecret, Math.floor(Date.now() / 30_000)),
    },
    false,
  );
  assert.equal(localVerified.status, 200);
  cookie = localVerified.setCookie!.split(';')[0];

  const socketContext = await request(
    '/context',
    { ip: '150.162.60.21', location: falseLocation },
    true,
    { 'X-Forwarded-For': '150.162.60.21' },
  );
  assert.equal(socketContext.data.observed.ip, '127.0.0.1');
  assert.equal(socketContext.data.observed.country, null);
  record(
    'Modo normal ignora IP forjado e reconhece loopback',
    socketContext.status,
    socketContext.data,
  );
  await stop(gateway);

  const gatewayOffline = await request('/checkout', {
    items: [{ product_id: 'P01', quantity: 1 }],
  });
  assert.equal(gatewayOffline.status, 502);
  assert.equal(gatewayOffline.data.status, 'ERROR');
  record('Gateway indisponível nunca aprova pedido', gatewayOffline.status, gatewayOffline.data);

  let fakeMode = 'clear-approval';
  const fakeGateway = createServer(async (incoming, outgoing) => {
    if (fakeMode === 'clear-approval') {
      incoming.resume();
      outgoing.writeHead(200, { 'Content-Type': 'application/json' });
      outgoing.end(JSON.stringify({ status: 'APPROVED', order_id: 'fake' }));

      return;
    }

    // Abre o pedido capturado para montar as respostas falsas dos próximos testes.
    const chunks: Buffer[] = [];

    for await (const chunk of incoming) {
      chunks.push(Buffer.from(chunk));
    }

    const sent = await open<Payment>(
      JSON.parse(Buffer.concat(chunks).toString()),
      shared,
      'payment',
    );
    const result: PaymentResult = {
      order_id: sent.order_id,
      nonce: sent.nonce,
      status: 'APPROVED',
      timestamp: Math.floor(Date.now() / 1000),
    };

    if (fakeMode === 'clear-block') {
      outgoing.writeHead(409, { 'Content-Type': 'application/json' });
      outgoing.end(
        JSON.stringify({ ...result, status: 'BLOCKED', reason: 'FORGED_CLEAR_RESPONSE' }),
      );

      return;
    }

    if (fakeMode === 'wrong-order') {
      result.order_id = `ORD-${randomUUID()}`;
    }

    const reply = await seal(result, shared, 'response');

    if (fakeMode === 'bad-tag') {
      const tag = Buffer.from(reply.tag, 'base64');
      tag[0] ^= 1;
      reply.tag = tag.toString('base64');
    }

    outgoing.writeHead(200, { 'Content-Type': 'application/json' });
    outgoing.end(JSON.stringify(reply));
  });
  await new Promise<void>((resolveListen) => fakeGateway.listen(4400, '127.0.0.1', resolveListen));

  try {
    const forgedResponse = await request('/checkout', {
      items: [{ product_id: 'P01', quantity: 1 }],
    });
    assert.equal(forgedResponse.status, 502);
    assert.equal(forgedResponse.data.status, 'ERROR');
    record(
      'Resposta APPROVED em claro/falsa não aprova pedido',
      forgedResponse.status,
      forgedResponse.data,
    );

    for (const [mode, name] of [
      ['clear-block', 'Resposta BLOCKED em claro não confirma bloqueio do pedido'],
      ['bad-tag', 'Tag adulterada da resposta do gateway'],
      ['wrong-order', 'Resposta autenticada de outro pedido'],
    ]) {
      fakeMode = mode;

      const rejected = await request('/checkout', { items: [{ product_id: 'P01', quantity: 1 }] });
      assert.equal(rejected.status, 502);
      assert.equal(rejected.data.status, 'ERROR');

      const history = await request('/orders');
      const order = history.data.orders.find(
        (item: { id: string }) => item.id === rejected.data.order_id,
      );
      assert.equal(order.status, 'ERROR');
      record(name, rejected.status, rejected.data);
    }
  } finally {
    await new Promise<void>((resolveClose) => fakeGateway.close(() => resolveClose()));
  }

  await stop(shop);

  const shopDb = new Database(resolve(directory, 'loja.sqlite'), { readonly: true });
  const stored = shopDb.prepare('SELECT * FROM users WHERE email = ?').get(email);
  assert.ok(!JSON.stringify(stored).includes(accountPassword));
  assert.ok(!JSON.stringify(stored).includes(secret));

  const sessions = shopDb.prepare('SELECT * FROM sessions').all();
  assert.ok(!JSON.stringify(sessions).includes(cookie.split('=')[1]));
  record('SQLite sem senha, segredo TOTP ou token de sessão em claro', 'PASS', {
    users: 2,
    checkedEncryptedTotp: true,
  });
  shopDb.close();

  const failedStart = start('server/index.ts', {}, randomBytes(32));
  const badExit = await new Promise<number | null>((resolveExit) =>
    failedStart.once('exit', resolveExit),
  );
  assert.notEqual(badExit, 0);
  record(
    'Senha de cofre incorreta impede inicialização',
    String(badExit),
    'Processo encerrou sem abrir a API',
  );
  completed = true;
  console.log(`\n${evidence.length} verificações passaram. Evidências: docs/evidencias-http.json`);
} catch (error) {
  console.error(logs.slice(-12).join(''));
  throw error;
} finally {
  await Promise.all([...children].map(stop));
  password.fill(0);
  shared.fill(0);
  mkdirSync('docs', { recursive: true });
  writeFileSync(
    'docs/evidencias-http.json',
    JSON.stringify(
      {
        executedAt: new Date().toISOString(),
        node: process.version,
        isolatedDataDirectory: relative(process.cwd(), directory).replaceAll('\\', '/'),
        completed,
        passed: evidence.length,
        checks: evidence,
      },
      null,
      2,
    ),
  );
  writeFileSync(resolve(directory, 'server.log'), logs.join(''));
}
