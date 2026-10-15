import { useState, type FormEvent } from 'react';
import { errorMessage } from '../../../lib/api';
import { testTotpRequest } from '../api';
import type { Evidence } from '../types';

type Props = {
  email: string;
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onEvidence: (evidence: Evidence | null) => void;
  onError: (error: string) => void;
};

export default function InvalidTotpTest({ email, busy, onBusy, onEvidence, onError }: Props) {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('000000');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onBusy(true);
    onError('');
    onEvidence(null);

    try {
      onEvidence(await testTotpRequest(email, password, code));
    } catch (cause) {
      onError(errorMessage(cause));
    } finally {
      setPassword('');
      onBusy(false);
    }
  }

  return (
    <form
      className="my-6 flex max-w-[390px] flex-col rounded-[9px] border border-zinc-200 bg-white p-[22px]"
      onSubmit={submit}
    >
      <p className="subtitle mt-0 mb-[18px]">
        Use sua senha e um código diferente dos códigos do autenticador.
      </p>
      <label htmlFor="test-email">E-mail</label>
      <input id="test-email" type="email" value={email} readOnly autoComplete="username" />
      <label htmlFor="test-password">Senha</label>
      <input
        id="test-password"
        type="password"
        autoComplete="current-password"
        maxLength={128}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      <label htmlFor="test-code">Código incorreto</label>
      <input
        id="test-code"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
        required
      />
      <button className="primary" disabled={busy || code.length !== 6}>
        Testar código
      </button>
    </form>
  );
}
