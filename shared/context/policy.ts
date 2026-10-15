import type { Decision, Location } from './types.js';
import { demoMode } from './config.js';

export function decide(location: Location, baseline: Location | null): Decision {
  if (location.source === 'server-demo' && !demoMode) {
    return { allowed: false, reason: 'DEMO_DISABLED', location };
  }

  if (location.kind === 'unknown') {
    return { allowed: false, reason: 'UNKNOWN_LOCATION', location };
  }

  // Sem país em conexões locais, compara o tipo de acesso com o contexto anterior.
  if (location.kind === 'local') {
    const localReference = !baseline || baseline.kind === 'local';

    return {
      allowed: localReference,
      reason: localReference ? 'LOCAL_CONNECTION' : 'CONTEXT_CHANGED',
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
