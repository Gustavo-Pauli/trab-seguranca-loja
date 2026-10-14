export type Location = {
  ip: string;
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  asn: string | null;
  organization: string | null;
  kind: 'public' | 'local' | 'unknown';
  source: 'socket' | 'server-demo';
};
export type Decision = { allowed: boolean; reason: string; location: Location };
