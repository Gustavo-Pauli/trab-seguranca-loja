import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import { confirmTotp } from '../api';
import { errorMessage } from '../../../lib/api';
import AuthPanel from './AuthPanel';

export default function TotpForm() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { challenge, setChallenge, acceptSession } = useAuth();
  const navigate = useNavigate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!challenge) {
      return;
    }

    setBusy(true);
    setError('');

    try {
      const response = await confirmTotp(challenge.challengeToken, code);
      setCode('');
      setChallenge(null);
      acceptSession(response.user);
      navigate('/store', { replace: true });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  function goBack() {
    setChallenge(null);
    navigate('/login', { replace: true });
  }

  if (!challenge) {
    return <Navigate to="/login" replace />;
  }

  const enrolling = challenge.mode === 'enroll';

  return (
    <AuthPanel
      label="Segundo fator"
      title={enrolling ? 'Configure seu autenticador' : 'Confirme seu acesso'}
    >
      <p className="subtitle">
        {enrolling ? 'Escaneie o QR code e digite o código.' : 'Digite o código do autenticador.'}
      </p>
      {enrolling && (
        <div className="mt-3.5 text-center">
          <img
            className="mx-auto block h-auto max-w-full"
            src={challenge.qrCodeDataUrl}
            width="220"
            height="220"
            alt="QR code para configurar o autenticador"
          />
          <details className="mt-1 text-xs text-zinc-500">
            <summary>Usar chave manual</summary>
            <code className="mt-2 block rounded-md bg-zinc-100 p-3 break-all text-zinc-800">
              {challenge.manualSecret}
            </code>
          </details>
        </div>
      )}
      <form className="mt-[26px] flex flex-col" onSubmit={submit}>
        <label htmlFor="code">Código de verificação</label>
        <input
          id="code"
          className="pl-[19px] text-center text-[22px] tracking-[7px]"
          autoFocus
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          required
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary w-full" disabled={busy || code.length !== 6}>
          {busy ? 'Verificando…' : 'Confirmar'}
        </button>
      </form>
      <button className="text-button mx-auto mt-[17px] block" onClick={goBack} disabled={busy}>
        Voltar ao login
      </button>
    </AuthPanel>
  );
}
