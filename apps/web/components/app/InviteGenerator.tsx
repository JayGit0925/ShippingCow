'use client';

import { useState } from 'react';
import type { OrgMemberRole } from '@shippingcow/shared';

export function InviteGenerator({ orgId }: { orgId: string }) {
  const [role, setRole] = useState<OrgMemberRole>('member');
  const [inviteLink, setInviteLink] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generateInvite() {
    setError('');
    setLoading(true);
    const res = await fetch(`/api/orgs/${orgId}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const { error: errMsg } = await res.json();
      setError(errMsg ?? 'Failed to generate invite');
      setLoading(false);
      return;
    }
    const { invite_url } = await res.json();
    setInviteLink(invite_url);
    setLoading(false);
    setCopied(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold text-gray-900">Invite team member</h3>
      <div className="mt-3 flex gap-2">
        <select value={role} onChange={(e) => setRole(e.target.value as OrgMemberRole)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
          <option value="admin">Admin</option>
          <option value="member">Member</option>
          <option value="viewer">Viewer</option>
        </select>
        <button onClick={generateInvite} disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          style={{ backgroundColor: '#0052C9' }}>
          {loading ? 'Generating...' : 'Generate invite link'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {inviteLink && (
        <div className="mt-3 flex items-center gap-2">
          <input readOnly value={inviteLink}
            className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs"
            onFocus={(e) => e.target.select()} />
          <button onClick={copyLink}
            className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}
