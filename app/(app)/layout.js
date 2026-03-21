import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session.mjs';
import { resolveUserDisplay } from '@/lib/user-display.mjs';
import { ADMIN_ROLES } from '@/lib/config.mjs';
import Sidebar from '@/components/dashboard/Sidebar';
import ThemeProvider from '@/components/ThemeProvider';
import TaskDrawerProvider from '@/components/TaskDrawerProvider';

export default async function AppLayout({ children }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const user = await resolveUserDisplay(session);
  const canAdmin = ADMIN_ROLES.includes(user.role);

  return (
    <ThemeProvider>
      <TaskDrawerProvider>
        <div className="flex min-h-screen">
          <Sidebar user={user} canAdmin={canAdmin} />
          <main className="flex-1 ml-16 md:ml-56 p-4 md:p-5 lg:p-6">
            {children}
          </main>
        </div>
      </TaskDrawerProvider>
    </ThemeProvider>
  );
}
