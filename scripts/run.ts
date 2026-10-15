import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { passwordPrompt } from './password.js';
import { verifyVaultPair } from '../shared/protocol/vault.js';

const dev = process.argv.includes('--dev');
const demo = process.argv.includes('--demo');
const ipIndex = process.argv.indexOf('--ip');
const ip = ipIndex < 0 ? '150.162.60.21' : process.argv[ipIndex + 1];

if (ipIndex >= 0 && !demo) {
  throw new Error('--ip exige --demo.');
}

const directory = resolve(process.env.DATA_DIR ?? '.data');
const password = await passwordPrompt('Senha de desbloqueio: ');
const children: ChildProcess[] = [];
let stopping = false;

function stop(code = 0) {
  if (stopping) {
    return;
  }

  stopping = true;

  for (const child of children) {
    child.kill('SIGTERM');
  }

  process.exitCode = code;
}

try {
  // Abre os dois cofres e compara os segredos antes de iniciar loja e gateway.
  await verifyVaultPair(
    resolve(directory, 'loja-segredo.json'),
    resolve(directory, 'gateway-segredo.json'),
    password,
  );

  const env = {
    ...process.env,
    DEMO_MODE: String(demo),
    ...(demo ? { DEMO_IP: ip } : { DEMO_IP: '' }),
  };
  function start(args: string[], unlock = false) {
    const child = spawn(process.execPath, args, {
      env,
      stdio: ['pipe', 'inherit', 'inherit'],
      windowsHide: true,
    });
    children.push(child);
    child.on('error', (error) => {
      console.error(error.message);
      stop(1);
    });
    child.on('exit', (code) => {
      if (!stopping) {
        stop(code ?? 1);
      }
    });
    child.stdin!.end(unlock ? password : undefined);
  }
  start(['--import', 'tsx', 'gateway/index.ts'], true);
  start(['--import', 'tsx', 'server/index.ts'], true);

  if (dev) {
    start(['node_modules/vite/bin/vite.js', '--host', '127.0.0.1']);
  }

  console.log(
    demo
      ? `[demo] IP de cenário definido no servidor: ${ip}`
      : '[local] IP observado pela conexão; geolocalização indisponível em loopback.',
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Falha na inicialização.');
  stop(1);
} finally {
  password.fill(0);
}

process.once('SIGINT', () => stop());
process.once('SIGTERM', () => stop());
