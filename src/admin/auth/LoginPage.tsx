import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from './AuthProvider';

export function LoginPage() {
  const { signIn, message } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    const problem = await signIn(email.trim(), password);
    if (problem) setError(problem);
    setBusy(false);
  }

  return (
    <main className="center-screen">
      <form className="panel login" onSubmit={onSubmit} noValidate>
        <h1>
          NOZI<span className="accent">Q</span>UE <small>Admin</small>
        </h1>
        {message && <p className="notice">{message}</p>}
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
