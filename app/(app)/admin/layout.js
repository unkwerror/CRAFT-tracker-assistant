import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session.mjs';
import { ADMIN_ROLES } from '@/lib/config.mjs';

export default async function AdminLayout({ children }) {
  const session = await getSession();
  if (!session || !ADMIN_ROLES.includes(session.role)) redirect('/dashboard');
  return <div className="max-w-6xl">{children}</div>;
}
