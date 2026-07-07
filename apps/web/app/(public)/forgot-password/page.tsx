'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@ellixr/ui';
import { forgotPassword } from '../../../lib/auth-actions';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold text-strong">Reset your password</h1>
        <p className="text-sm text-subtle">
          We&apos;ll email you a reset link if the account exists.
        </p>
      </div>

      {sent ? (
        <p className="rounded-md bg-tint-mint p-4 text-sm text-tint-mint-fg">
          If an account exists for {email}, a reset link is on its way.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-md border border-border bg-white px-4 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            placeholder="you@college.edu"
          />
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}

      <Link href="/login" className="block text-center text-sm text-primary-600 hover:underline">
        Back to sign in
      </Link>
    </Card>
  );
}
