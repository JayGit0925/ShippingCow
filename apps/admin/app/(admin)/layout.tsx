import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: admin } = await supabase
    .from('platform_admins').select('user_id').eq('user_id', user.id).single();

  if (!admin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="mt-2 text-gray-600">Platform admin access required.</p>
        </div>
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
