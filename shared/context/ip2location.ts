import { IP2Location } from 'ip2location-nodejs';
import { existsSync, openSync, readSync, closeSync } from 'node:fs';
import { resolve } from 'node:path';
import { isIP } from 'node:net';
import type { Location } from './types.js';

const binPath = resolve(process.env.IP2LOCATION_BIN ?? 'data/IP2LOCATION-LITE-DB5.BIN');
const reader = openDatabase(binPath);

// Identifica IPs locais e consulta os públicos na DB5; sem resultado, mantém unknown.
export function locate(rawIp: string, source: Location['source'] = 'socket'): Location {
  const ip = rawIp.replace(/^::ffff:/, '');
  const location = unknownLocation(ip, source);

  if (!isIP(ip)) {
    return location;
  }

  if (isLocalAddress(ip)) {
    return { ...location, kind: 'local' };
  }

  const result = reader.getAll(ip);

  if (!/^[A-Z]{2}$/.test(result.countryShort)) {
    return location;
  }

  return {
    ...location,
    kind: 'public',
    country: result.countryShort,
    region: optionalText(result.region),
    city: optionalText(result.city),
    latitude: optionalNumber(result.latitude),
    longitude: optionalNumber(result.longitude),
    // A DB5 não fornece ASN nem organização.
    asn: null,
    organization: null,
  };
}

function openDatabase(path: string): IP2Location {
  if (!existsSync(path)) {
    throw new Error(
      `Base IP2Location DB5 ausente: ${path}. Execute pnpm run setup --bin <caminho>.`,
    );
  }

  const database = new IP2Location();
  database.open(path);
  requireDb5(path);

  return database;
}

function requireDb5(path: string): void {
  const header = Buffer.alloc(1);
  const descriptor = openSync(path, 'r');

  try {
    // O primeiro byte do cabeçalho identifica o tipo da base.
    readSync(descriptor, header, 0, 1, 0);
  } finally {
    closeSync(descriptor);
  }

  if (header[0] !== 5) {
    throw new Error('É necessária a base IP2Location DB5.');
  }
}

function isLocalAddress(ip: string): boolean {
  const localIpv6 =
    ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:');

  return localIpv6 || ip === '0.0.0.0' || isLocalIpv4(ip);
}

function isLocalIpv4(ip: string): boolean {
  const octets = ip.split('.').map(Number);

  if (octets.length !== 4) {
    return false;
  }

  const first = octets[0];
  const second = octets[1];
  const loopback = first === 127;
  const privateNetwork =
    first === 10 ||
    (first === 192 && second === 168) ||
    (first === 172 && second >= 16 && second <= 31);
  const linkLocal = first === 169 && second === 254;

  return loopback || privateNetwork || linkLocal;
}

function unknownLocation(ip: string, source: Location['source']): Location {
  return {
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
}

function optionalText(value: string): string | null {
  return value && value !== '-' && !value.includes('unavailable') ? value : null;
}

function optionalNumber(value: string | number): number | null {
  return Number.isFinite(Number(value)) && value !== '-' ? Number(value) : null;
}
