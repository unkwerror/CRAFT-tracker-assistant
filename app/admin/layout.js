import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session.mjs';
import { resolveUserDisplay } from '@/lib/user-display.mjs';
import { ADMIN_ROLES } from '@/lib/config.mjs';
import Sidebar from '@/components/dashboard/Sidebar';

export default async function AdminLayout({ children }) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!ADMIN_ROLES.includes(session.role)) redirect('/dashboard');

  const user = await resolveUserDisplay(session);

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} canAdmin={true} />
      <main className="flex-1 ml-56 p-6 lg:p-8 max-w-6xl">
        {children}
      </main>
    </div>
  );
}
