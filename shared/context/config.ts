import { isIP } from 'node:net';

export const demoMode = process.env.DEMO_MODE === 'true';
export const demoIp = process.env.DEMO_IP;

if (demoIp && (!demoMode || !isIP(demoIp))) {
  throw new Error('DEMO_IP exige DEMO_MODE=true e um IP válido.');
}
