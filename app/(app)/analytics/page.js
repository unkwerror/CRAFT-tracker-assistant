import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session.mjs';
import AnalyticsView from './AnalyticsView';

export const metadata = { title: 'Аналитика — CRAFT' };

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const trackerConnected = !!process.env.TRACKER_ORG_ID;
  return <AnalyticsView trackerConnected={trackerConnected} />;
}
