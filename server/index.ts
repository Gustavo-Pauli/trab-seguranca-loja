import { resolve } from 'node:path';
import { secretFromStdin } from '../shared/protocol/vault.js';
import { db } from './lib/database.js';
import { createShopApp } from './app.js';

const directory = resolve(process.env.DATA_DIR ?? '.data');
const secret = await secretFromStdin(
  resolve(process.env.SHOP_VAULT ?? `${directory}/loja-segredo.json`),
  'shop',
);
const app = createShopApp(secret);
const port = Number(process.env.PORT ?? 3001);
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`[loja] API e build em http://127.0.0.1:${port}`);
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
