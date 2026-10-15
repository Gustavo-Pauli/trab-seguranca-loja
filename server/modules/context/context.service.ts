import type { Request } from 'express';
import { demoMode, demoIp } from '../../../shared/context/config.js';
import { locate } from '../../../shared/context/ip2location.js';
import type { Location } from '../../../shared/context/types.js';

/** Nenhum body/query/header participa desta escolha. trust proxy permanece false. */
export function requestLocation(req: Request): Location {
  if (demoMode && demoIp) {
    return locate(demoIp, 'server-demo');
  }
  return locate(req.socket.remoteAddress ?? '', 'socket');
}
