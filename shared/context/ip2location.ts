import { IP2Location } from 'ip2location-nodejs';
import { existsSync, openSync, readSync, closeSync } from 'node:fs';
import { resolve } from 'node:path';
import { isIP } from 'node:net';
import type { Location } from './types.js';

const binPath = resolve(process.env.IP2LOCATION_BIN ?? 'data/IP2LOCATION-LITE-DB5.BIN');
if (!existsSync(binPath))
  throw new Error(
    `Base IP2Location DB5 ausente: ${binPath}. Execute pnpm run setup --bin <caminho>.`,
  );
const reader = new IP2Location();
reader.open(binPath);
// Impede aceitar uma base diferente sem latitude/longitude.
const header = Buffer.alloc(1);
const binDescriptor = openSync(binPath, 'r');
try {
  readSync(binDescriptor, header, 0, 1, 0);
} finally {
  closeSync(binDescriptor);
}
if (header[0] !== 5) throw new Error('É necessária a base IP2Location DB5.');

function localIp(ip: string): boolean {
  if (
    ip === '::1' ||
    ip === '0.0.0.0' ||
    ip.startsWith('fc') ||
    ip.startsWith('fd') ||
    ip.startsWith('fe80:')
  )
    return true;
  const octets = ip.split('.').map(Number);
  return (
    octets.length === 4 &&
    (octets[0] === 127 ||
      octets[0] === 10 ||
      (octets[0] === 192 && octets[1] === 168) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 169 && octets[1] === 254))
  );
}

export function locate(rawIp: string, source: Location['source'] = 'socket'): Location {
  const ip = rawIp.replace(/^::ffff:/, '');
  const empty: Location = {
    ip,
    country: null,
    region: null,
    city: null,
    latitude: null,
    longitude: null,
    asn: null,
    organization: null,
    kind: 'unknown',
    source,
  };
  if (!isIP(ip)) return empty;
  if (localIp(ip)) return { ...empty, kind: 'local' };
  const result = reader.getAll(ip);
  if (!/^[A-Z]{2}$/.test(result.countryShort)) return empty;
  const field = (value: string) =>
    value && value !== '-' && !value.includes('unavailable') ? value : null;
  const number = (value: string | number) =>
    Number.isFinite(Number(value)) && value !== '-' ? Number(value) : null;
  return {
    ...empty,
    kind: 'public',
    country: result.countryShort,
    region: field(result.region),
    city: field(result.city),
    latitude: number(result.latitude),
    longitude: number(result.longitude),
    asn: null,
    organization: null,
  }; // DB5 não contém ASN/organização.
}
