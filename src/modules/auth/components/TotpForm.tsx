import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import { confirmTotp } from '../api';
import { errorMessage } from '../../../lib/api';

export default function TotpForm() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { challenge, setChallenge, acceptSession } = useAuth();
  const navigate = useNavigate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge) return;
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
  if (!challenge) return <Navigate to="/login" replace />;
  const enrolling = challenge.mode === 'enroll';

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-label="Segundo fator">
        <h1>{enrolling ? 'Configure seu autenticador' : 'Confirme seu acesso'}</h1>
        <p className="subtitle">
          {enrolling ? 'Escaneie o QR code e digite o código.' : 'Digite o código do autenticador.'}
        </p>
        {enrolling && (
          <div className="enrollment">
            <img
              src={challenge.qrCodeDataUrl}
              width="220"
              height="220"
              alt="QR code para configurar o autenticador"
            />
            <details>
              <summary>Usar chave manual</summary>
              <code>{challenge.manualSecret}</code>
            </details>
          </div>
        )}
        <form onSubmit={submit}>
          <label htmlFor="code">Código de verificação</label>
          <input
            id="code"
            className="code-input"
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
          <button className="primary full" disabled={busy || code.length !== 6}>
            {busy ? 'Verificando…' : 'Confirmar'}
          </button>
        </form>
        <button className="text-button back" onClick={goBack} disabled={busy}>
          Voltar ao login
        </button>
      </section>
    </main>
  );
}
