import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session.mjs';
import { ROLES } from '@/lib/config.mjs';
import Sidebar from '@/components/dashboard/Sidebar';

const ADMIN_ROLES = ['exdir', 'admin'];

export default async function AdminLayout({ children }) {
  const session = await getSession();
  if (!session) redirect('/login');

  if (!ADMIN_ROLES.includes(session.role)) redirect('/dashboard');

  const role = ROLES[session.role] || ROLES.architect;

  const user = {
    id: session.uid,
    name: session.name,
    role: session.role,
    roleLabel: role.label,
    roleColor: role.color,
    queues: role.queues,
  };

  const roleConfig = {
    label: role.label,
    canManageRoles: true,
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} roleConfig={roleConfig} />
      <main className="flex-1 ml-56 p-6 lg:p-8 max-w-6xl">
        {children}
      </main>
    </div>
  );
}
