import type { Location } from '../context/types.js';
import type { Item } from '../catalog.js';

export type Authorization = {
  user_id: string;
  authenticated: true;
  totp_verified: true;
  totp_counter: number;
  issued_at: number;
  expires_at: number;
  baseline: Location | null;
};
export type Payment = {
  order_id: string;
  user_id: string;
  amount: number;
  amount_cents: number;
  currency: 'BRL';
  nonce: string;
  timestamp: number;
  items: Item[];
  location: Location;
  authorization: Authorization;
};
export type PaymentResult = {
  order_id: string | null;
  nonce: string | null;
  status: 'APPROVED' | 'BLOCKED';
  timestamp: number;
  reason?: string;
};

export type Purpose = 'payment' | 'response' | 'vault:shop' | 'vault:gateway';
export type Envelope = { version: 1; salt: string; ciphertext: string; tag: string };
