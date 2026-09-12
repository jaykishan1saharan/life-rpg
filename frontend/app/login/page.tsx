'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  loginWithEmail,
  loginWithGoogle,
} from '../../src/services/auth.service';

import { getCurrentUser } from '../../src/services/api.service';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      await loginWithEmail(email, password);

      await getCurrentUser();

      router.push('/dashboard');
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : 'Login failed',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError('');
    setLoading(true);

    try {
      await loginWithGoogle();

      await getCurrentUser();

      router.push('/dashboard');
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : 'Google authentication failed',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <h1 className="mb-2 text-3xl font-bold">
          Welcome Back
        </h1>

        <p className="mb-8 text-sm text-gray-400">
          Continue your adventure.
        </p>

        <form
          onSubmit={handleLogin}
          className="space-y-4"
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            required
            className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            required
            className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none"
          />

          {error && (
            <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-black transition hover:bg-gray-200 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-gray-500">
            OR
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full rounded-lg border border-white/10 px-4 py-3 font-medium transition hover:bg-white/5 disabled:opacity-50"
        >
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-gray-400">
          New player?{' '}
          <a
            href="/register"
            className="text-white underline"
          >
            Create account
          </a>
        </p>
      </div>
    </main>
  );
}