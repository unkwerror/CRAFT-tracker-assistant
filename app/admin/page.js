import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session.mjs';
import { ROLE_DASHBOARD } from '@/lib/dashboard-config.mjs';
import AdminPanel from '@/components/dashboard/AdminPanel';

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const dashConfig = ROLE_DASHBOARD[session.role] || ROLE_DASHBOARD.architect;

  // Access control: only exdir and admin can manage roles
  if (!dashConfig.canManageRoles) {
    redirect('/dashboard');
  }

  return <AdminPanel currentUserId={session.uid} currentUserRole={session.role} />;
}
