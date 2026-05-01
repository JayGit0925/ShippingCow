'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AcceptInvitePage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) { setStatus('error'); setMessage('No invite token provided.'); return; }

    async function acceptInvite() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/signup?invite_token=${token}`);
        return;
      }

      const res = await fetch('/api/orgs/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const { error: errMsg } = await res.json();
        setStatus('error');
        setMessage(errMsg ?? 'Failed to accept invite.');
        return;
      }

      setStatus('success');
      setMessage('You have joined the organization.');
      setTimeout(() => router.push('/dashboard'), 2000);
    }

    acceptInvite();
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        {status === 'loading' && <p className="text-gray-600">Accepting invitation...</p>}
        {status === 'success' && <p className="text-green-700 font-semibold">{message}</p>}
        {status === 'error' && <p className="text-red-600">{message}</p>}
      </div>
    </div>
  );
}
