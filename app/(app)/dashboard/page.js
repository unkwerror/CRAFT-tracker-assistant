import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session.mjs';
import { resolveUserDisplay } from '@/lib/user-display.mjs';
import DashboardShell from '@/components/dashboard/DashboardShell';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const resolved = await resolveUserDisplay(session);

  const user = {
    ...resolved,
    trackerConnected: !!process.env.TRACKER_ORG_ID,
    dbConnected: !!process.env.DATABASE_URL,
  };

  return <DashboardShell user={user} />;
}
