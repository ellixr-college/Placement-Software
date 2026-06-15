'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Card } from '@ellixr/ui';
import { homePathForRole } from '@ellixr/auth';
import { login } from '../../../lib/auth-actions';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.mustChangePassword) {
        router.push('/me/change-password');
        return;
      }
      const next = params.get('next');
      router.push(next || homePathForRole(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="bg-gradient-primary bg-clip-text text-3xl font-bold text-transparent">
          Ellixr
        </h1>
        <p className="text-sm text-subtle">Sign in to your account</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-strong">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-md border border-border bg-white px-4 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            placeholder="you@college.edu"
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-strong">Password</label>
            <Link href="/forgot-password" className="text-xs text-primary-600 hover:underline">
              Forgot?
            </Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-md border border-border bg-white px-4 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </Card>
  );
}
