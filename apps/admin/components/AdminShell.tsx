'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const navItems = [
    { href: '/admin/orgs', label: 'Orgs' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/reference-data', label: 'Reference Data' },
    { href: '/admin/audit-log', label: 'Audit Log' },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-gray-900 p-4 text-white flex flex-col">
        <div className="mb-6">
          <Link href="/admin/orgs" className="text-lg font-bold">
            ShippingCow <span className="text-xs uppercase text-gray-400">Admin</span>
          </Link>
        </div>
        <nav className="space-y-1 flex-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                pathname.startsWith(item.href) ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'
              }`}>
              {item.label}
            </Link>
          ))}
        </nav>
        <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">
          Sign out
        </button>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
