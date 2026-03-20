import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session.mjs';
import { ROLES } from '@/lib/config.mjs';
import { ROLE_DASHBOARD } from '@/lib/dashboard-config.mjs';
import Sidebar from '@/components/dashboard/Sidebar';

export default async function DashboardLayout({ children }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const role = ROLES[session.role] || ROLES.architect;
  const dashConfig = ROLE_DASHBOARD[session.role] || ROLE_DASHBOARD.architect;

  const user = {
    id: session.uid,
    name: session.name,
    role: session.role,
    roleLabel: role.label,
    roleColor: role.color,
    queues: role.queues,
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} roleConfig={dashConfig} />
      <main className="flex-1 ml-56 p-5 lg:p-6">
        {children}
      </main>
    </div>
  );
}
