import type { Decision, Location } from './types.js';
import { demoMode } from './config.js';

export function decide(location: Location, baseline: Location | null): Decision {
  if (location.source === 'server-demo' && !demoMode) {
    return { allowed: false, reason: 'DEMO_DISABLED', location };
  }
  if (location.kind === 'unknown') {
    return { allowed: false, reason: 'UNKNOWN_LOCATION', location };
  }
  // Exceção explícita para a execução local: não representa detecção de país.
  if (location.kind === 'local') {
    return {
      allowed: !baseline || baseline.kind === 'local',
      reason: baseline && baseline.kind !== 'local' ? 'CONTEXT_CHANGED' : 'LOCAL_CONNECTION',
      location,
    };
  }
  if (baseline?.kind === 'public' && baseline.country !== location.country) {
    return { allowed: false, reason: 'COUNTRY_CHANGED', location };
  }
  let reason = 'KNOWN_CONTEXT';
  if (!baseline || baseline.kind !== 'public') {
    reason = 'FIRST_CONTEXT';
  } else if (baseline.region !== location.region) {
    reason = 'REGION_CHANGED';
  }
  return { allowed: true, reason, location };
}
