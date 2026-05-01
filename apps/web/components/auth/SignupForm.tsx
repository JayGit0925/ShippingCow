'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { company_name: companyName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) { setError(signUpError.message); setLoading(false); return; }
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="text-center">
        <h2 className="text-lg font-semibold text-green-700">Check your email</h2>
        <p className="mt-2 text-sm text-gray-600">
          We sent a verification link to <strong>{email}</strong>.
        </p>
        <a href="/login" className="mt-4 inline-block text-sm text-blue-600 hover:underline">Back to sign in</a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Company name</label>
        <input id="companyName" type="text" required value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600" />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
        <input id="email" type="email" required value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600" />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password (min 8 characters)</label>
        <input id="password" type="password" required minLength={8} value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600" />
      </div>
      <button type="submit" disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        style={{ backgroundColor: '#0052C9' }}>
        {loading ? 'Creating account...' : 'Create account'}
      </button>
      <p className="text-center text-sm text-gray-600">
        Already have an account? <a href="/login" className="text-blue-600 hover:underline">Sign in</a>
      </p>
    </form>
  );
}
