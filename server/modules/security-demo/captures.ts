import { demoMode } from '../../../shared/context/config.js';
import type { Payment, Envelope } from '../../../shared/protocol/types.js';

const captures = new Map<string, { payment: Payment; envelope: Envelope }>();

export function rememberCapture(userId: string, payment: Payment, envelope: Envelope) {
  if (demoMode) {
    captures.set(userId, { payment, envelope });
  }
}

export function captureFor(userId: string) {
  return captures.get(userId);
}
