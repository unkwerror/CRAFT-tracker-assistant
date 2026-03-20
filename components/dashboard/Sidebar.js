'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV = [
  { id: 'dashboard', label: 'Дашборд', href: '/dashboard', icon: GridIcon },
  { id: 'guide', label: 'Гайд', href: '/', icon: BookIcon },
];
const ADMIN_NAV = { id: 'admin', label: 'Управление', href: '/admin', icon: ShieldIcon };

export default function Sidebar({ user, roleConfig }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const canAdmin = roleConfig?.canManageRoles;
  const items = canAdmin ? [...NAV, ADMIN_NAV] : NAV;

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-craft-surface border-r border-craft-border flex flex-col z-40 transition-all duration-350 ${collapsed ? 'w-16' : 'w-56'}`}>
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-craft-border shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-craft-accent/10 flex items-center justify-center shrink-0">
            <span className="text-craft-accent text-xs font-bold font-display">K</span>
          </div>
          {!collapsed && <span className="text-[13px] font-display font-medium tracking-tight truncate">Крафт</span>}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {items.map(item => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.id} href={item.href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all duration-200 group
                ${active ? 'bg-white/[0.06] text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'}`}>
              <Icon className={`w-4 h-4 shrink-0 transition-colors duration-200 ${active ? 'text-craft-accent' : 'text-white/25 group-hover:text-white/40'}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-craft-border p-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-display shrink-0"
            style={{ background: (user?.roleColor || '#5BA4F5') + '15', color: user?.roleColor || '#5BA4F5' }}>
            {user?.name?.[0] || '?'}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium truncate">{user?.name || 'Пользователь'}</div>
              <div className="text-[11px] text-white/25 truncate">{user?.roleLabel || 'Сотрудник'}</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <a href="/api/auth/logout" className="mt-2 block text-[11px] text-white/20 hover:text-white/50 transition-colors duration-200">Выйти</a>
        )}
      </div>

      {/* Collapse */}
      <button onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-craft-surface border border-craft-border flex items-center justify-center text-white/20 hover:text-white/50 transition-all duration-200 hover:scale-110">
        <ChevronIcon className={`w-3 h-3 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
      </button>
    </aside>
  );
}

function GridIcon({ className }) {
  return (<svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>);
}
function BookIcon({ className }) {
  return (<svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.5 3h4.5a1 1 0 011 1v9.5l-1-.75L5.5 14l-1.5-1.25L2.5 14V3z"/><path d="M8.5 3H13a.5.5 0 01.5.5V13l-1.5-1.25L10.5 13l-1-.75-1 .75V4a1 1 0 011-1z"/></svg>);
}
function ShieldIcon({ className }) {
  return (<svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 1.5L2.5 4v4c0 3.5 2.5 5.5 5.5 6.5 3-1 5.5-3 5.5-6.5V4L8 1.5z"/><path d="M6 8l1.5 1.5L10 6.5"/></svg>);
}
function ChevronIcon({ className }) {
  return (<svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 4l-4 4 4 4"/></svg>);
}
