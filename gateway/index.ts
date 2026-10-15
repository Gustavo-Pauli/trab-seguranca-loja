import { resolve } from 'node:path';
import { secretFromStdin } from '../shared/protocol/vault.js';
import { db } from './lib/database.js';
import { createGatewayApp } from './app.js';

const directory = resolve(process.env.DATA_DIR ?? '.data');
const secret = await secretFromStdin(
  resolve(process.env.GATEWAY_VAULT ?? `${directory}/gateway-segredo.json`),
  'gateway',
);
const app = createGatewayApp(secret);
const server = app.listen(Number(process.env.GATEWAY_PORT ?? 4000), '127.0.0.1', () => {
  console.log('[gateway] Pronto.');
});
function close() {
  server.close(() => {
    secret.fill(0);
    db.close();
    process.exit(0);
  });
}
process.once('SIGTERM', close);
process.once('SIGINT', close);
