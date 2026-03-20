import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session.mjs';
import { ADMIN_ROLES } from '@/lib/config.mjs';
import AdminPanel from '@/components/dashboard/AdminPanel';

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  if (!ADMIN_ROLES.includes(session.role)) {
    redirect('/dashboard');
  }

  return <AdminPanel currentUserId={session.uid} currentUserRole={session.role} />;
}
