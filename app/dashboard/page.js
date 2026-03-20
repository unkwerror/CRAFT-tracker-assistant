import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session.mjs';
import { ROLES } from '@/lib/config.mjs';
import DashboardShell from '@/components/dashboard/DashboardShell';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const role = ROLES[session.role] || ROLES.architect;

  const user = {
    id: session.uid,
    name: session.name,
    role: session.role,
    roleLabel: role.label,
    roleColor: role.color,
    queues: role.queues,
    trackerConnected: !!process.env.TRACKER_ORG_ID,
    dbConnected: !!process.env.DATABASE_URL,
  };

  return <DashboardShell user={user} />;
}
