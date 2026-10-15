import type { Request } from 'express';
import { demoMode, demoIp } from '../../../shared/context/config.js';
import { locate } from '../../../shared/context/ip2location.js';
import type { Location } from '../../../shared/context/types.js';

export function requestLocation(req: Request): Location {
  if (demoMode && demoIp) {
    return locate(demoIp, 'server-demo');
  }

  // Fora do demo, consulta o endereço da conexão, sem usar o IP enviado pelo cliente.
  return locate(req.socket.remoteAddress ?? '', 'socket');
}
