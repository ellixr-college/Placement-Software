'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card } from '@ellixr/ui';
import { resetPassword } from '../../../../lib/auth-actions';
import { PasswordInput } from '../../../../components/password-input';

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(params.token, password);
      setDone(true);
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-6">
      <h1 className="text-center text-2xl font-semibold text-strong">Set a new password</h1>

      {done ? (
        <p className="rounded-md bg-tint-mint p-4 text-center text-sm text-tint-mint-fg">
          Password updated. Redirecting to sign in…
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <PasswordInput
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-md border border-border bg-white px-4 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            placeholder="New password"
          />
          <PasswordInput
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-11 w-full rounded-md border border-border bg-white px-4 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            placeholder="Confirm password"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            {loading ? 'Saving…' : 'Update password'}
          </Button>
        </form>
      )}

      <Link href="/login" className="block text-center text-sm text-primary-600 hover:underline">
        Back to sign in
      </Link>
    </Card>
  );
}
