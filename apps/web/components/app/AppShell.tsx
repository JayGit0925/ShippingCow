'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Org } from '@shippingcow/shared';

export function AppShell({ org, children }: { org: Org | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-gray-50 p-4 flex flex-col">
        <div className="mb-6">
          <Link href="/dashboard" className="text-xl font-bold" style={{ color: '#0052C9' }}>ShippingCow</Link>
        </div>
        {org && (
          <div className="mb-4 text-sm">
            <div className="font-medium text-gray-900 truncate">{org.name}</div>
            <div className="text-xs text-gray-500 capitalize">{org.tier} tier</div>
          </div>
        )}
        <nav className="space-y-1 flex-1">
          <Link href="/dashboard"
            className={`block rounded-md px-3 py-2 text-sm font-medium ${pathname === '/dashboard' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            style={pathname === '/dashboard' ? { backgroundColor: '#0052C9' } : {}}>
            Dashboard
          </Link>
          <Link href="/upload"
            className={`block rounded-md px-3 py-2 text-sm font-medium ${pathname.startsWith('/upload') ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            style={pathname.startsWith('/upload') ? { backgroundColor: '#0052C9' } : {}}>
            Upload
          </Link>
          <Link href="/silo"
            className={`block rounded-md px-3 py-2 text-sm font-medium ${pathname.startsWith('/silo') ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            style={pathname.startsWith('/silo') ? { backgroundColor: '#0052C9' } : {}}>
            Silo
          </Link>
          <Link href="/org"
            className={`block rounded-md px-3 py-2 text-sm font-medium ${pathname.startsWith('/org') ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            style={pathname.startsWith('/org') ? { backgroundColor: '#0052C9' } : {}}>
            Org Settings
          </Link>
        </nav>
        <div className="pt-4 border-t">
          {org && (
            <div className="mb-2 rounded-md bg-gray-100 px-3 py-1 text-center text-xs font-medium uppercase text-gray-600">
              {org.tier}
            </div>
          )}
          <button onClick={handleLogout}
            className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
