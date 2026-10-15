import { useState } from 'react';
import { errorMessage } from '../../../lib/api';
import { runAttackRequest } from '../api';
import AttackResult from './AttackResult';
import InvalidTotpTest from './InvalidTotpTest';
import type { Evidence } from '../types';
import type { User } from '../../auth/types';

const mainAttacks = [
  { action: 'replay', label: 'Replay' },
  { action: 'tamper', label: 'Alterar valor' },
  { action: 'location', label: 'Localização falsa' },
];

export default function SecurityPanel({ user }: { user: User }) {
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showTotp, setShowTotp] = useState(false);

  async function runAttack(action: string) {
    setBusy(true);
    setError('');
    setEvidence(null);
    setShowTotp(false);

    try {
      setEvidence(await runAttackRequest(action));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  function openTotpTest() {
    setShowTotp(true);
    setEvidence(null);
    setError('');
  }

  return (
    <main className="mx-auto max-w-[1000px] px-6 py-10">
      <h1>Testes de segurança</h1>
      <p className="subtitle">Para replay e alteração de valor, compre 2 cadernos (R$ 100).</p>
      <div className="my-6 flex flex-wrap gap-2.5" aria-label="Quatro ataques obrigatórios">
        {mainAttacks.map(({ action, label }) => (
          <button
            className="secondary"
            key={action}
            disabled={busy}
            onClick={() => runAttack(action)}
          >
            {label}
          </button>
        ))}
        <button className="secondary" disabled={busy} onClick={openTotpTest}>
          TOTP inválido
        </button>
      </div>

      {showTotp && (
        <InvalidTotpTest
          email={user.email}
          busy={busy}
          onBusy={setBusy}
          onEvidence={setEvidence}
          onError={setError}
        />
      )}

      {busy && <p role="status">Executando…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {evidence && <AttackResult evidence={evidence} />}

      <details className="mt-6 text-[13px] text-zinc-600">
        <summary>Testes adicionais</summary>
        <div className="my-6 flex flex-wrap gap-2.5">
          <button className="secondary" disabled={busy} onClick={() => runAttack('expired')}>
            Timestamp vencido
          </button>
          <button className="secondary" disabled={busy} onClick={() => runAttack('inconsistent')}>
            Total inconsistente
          </button>
        </div>
      </details>
    </main>
  );
}
