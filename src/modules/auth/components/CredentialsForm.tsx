import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { errorMessage } from '../../../lib/api';
import { login, register } from '../api';
import { useAuth } from '../AuthProvider';
import AuthPanel from './AuthPanel';

export default function CredentialsForm({ mode }: { mode: 'login' | 'register' }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { setChallenge } = useAuth();
  const navigate = useNavigate();
  const registering = mode === 'register';

  let submitLabel = registering ? 'Criar conta' : 'Entrar';
  if (busy) {
    submitLabel = 'Aguarde…';
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const challenge = registering
        ? await register(name, email, password)
        : await login(email, password);
      setPassword('');
      setChallenge(challenge);
      navigate('/totp');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthPanel label="Autenticação" title={registering ? 'Crie sua conta' : 'Entre na sua conta'}>
      <form className="mt-[26px] flex flex-col" onSubmit={submit}>
        {registering && (
          <>
            <label htmlFor="name">Nome</label>
            <input
              id="name"
              autoComplete="name"
              minLength={2}
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </>
        )}
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          type="password"
          autoComplete={registering ? 'new-password' : 'current-password'}
          minLength={registering ? 8 : undefined}
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary w-full" disabled={busy}>
          {submitLabel}
        </button>
      </form>
      <p className="mt-[23px] text-center text-[13px] text-zinc-500">
        {registering ? 'Já tem uma conta?' : 'Ainda não tem conta?'}{' '}
        <Link className="text-button ml-1 font-medium" to={registering ? '/login' : '/register'}>
          {registering ? 'Entrar' : 'Criar conta'}
        </Link>
      </p>
    </AuthPanel>
  );
}
