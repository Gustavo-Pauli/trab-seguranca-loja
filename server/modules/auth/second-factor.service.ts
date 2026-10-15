import { HttpError } from '../../lib/http-error.js';
import { getUserById, useTotpCounter } from './auth.repository.js';
import { takeAttempt, discardChallenge, discardUserChallenges } from './challenges.js';
import { verifyTotp } from './totp.js';
import { baselineFor, rememberBaseline } from '../context/context.repository.js';
import { decide } from '../../../shared/context/policy.js';
import type { Location } from '../../../shared/context/types.js';

export function verifySecondFactor(challengeToken: string, code: string, location: Location) {
  const challenge = takeAttempt(challengeToken);
  const counter = verifyTotp(challenge.secret, code);
  if (counter === null) {
    if (challenge.attempts >= 5) {
      discardChallenge(challengeToken);
    }
    throw new HttpError(401, 'TOTP inválido ou expirado.');
  }
  const decision = decide(location, baselineFor(challenge.userId));
  if (challenge.ip !== location.ip || !decision.allowed) {
    discardChallenge(challengeToken);
    throw new HttpError(
      403,
      'Acesso bloqueado pelo contexto da conexão.',
      challenge.ip !== location.ip ? 'CONTEXT_CHANGED' : decision.reason,
    );
  }
  if (!useTotpCounter(challenge.userId, counter)) {
    throw new HttpError(401, 'Este código TOTP já foi utilizado.');
  }
  discardUserChallenges(challenge.userId);
  const user = getUserById(challenge.userId);
  if (!user) {
    throw new HttpError(401, 'Usuário não encontrado.');
  }
  rememberBaseline(user.id, location);
  return { user: { id: user.id, name: user.name, email: user.email }, counter, decision };
}
