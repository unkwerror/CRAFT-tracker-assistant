'use client';
import { useState, useEffect, useCallback } from 'react';

const AVAILABLE_ROLES = [
  { value: 'director', label: 'Генеральный директор', color: '#5BA4F5' },
  { value: 'exdir', label: 'Исполнительный директор', color: '#C9A0FF' },
  { value: 'gip', label: 'ГИП', color: '#42C774' },
  { value: 'architect', label: 'Архитектор / Инженер', color: '#FFB155' },
  { value: 'manager', label: 'Менеджер по продажам', color: '#6DD8E0' },
  { value: 'admin', label: 'Администратор', color: '#7A8899' },
];

// Stub users for when DB is not connected
const STUB_USERS = [
  { id: 1, name: 'Гришанова Н.А.', email: 'grishanova@craft72.ru', role: 'director', last_login: '2026-03-19T10:00:00' },
  { id: 2, name: 'Саврина Е.В.', email: 'savrina@craft72.ru', role: 'exdir', last_login: '2026-03-20T09:15:00' },
  { id: 3, name: 'Иванова А.С.', email: 'ivanova@craft72.ru', role: 'gip', last_login: '2026-03-20T08:30:00' },
  { id: 4, name: 'Солдатов М.Ю.', email: 'soldatov@craft72.ru', role: 'gip', last_login: '2026-03-18T14:20:00' },
  { id: 5, name: 'Сахаутдинов Р.Ф.', email: 'sahautdinov@craft72.ru', role: 'gip', last_login: '2026-03-17T11:00:00' },
  { id: 6, name: 'Дмитриев К.Н.', email: 'dmitriev@craft72.ru', role: 'manager', last_login: '2026-03-20T07:45:00' },
  { id: 7, name: 'Новиков П.Д.', email: 'novikov@craft72.ru', role: 'architect', last_login: '2026-03-15T16:00:00' },
  { id: 8, name: 'Козлова Д.И.', email: 'kozlova@craft72.ru', role: 'architect', last_login: null },
];

const STORAGE_KEY = 'craft_admin_roles';

// localStorage fallback when DB isn't connected
function loadLocalRoles() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch { return null; }
}

function saveLocalRoles(roles) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
}

export default function AdminPanel({ currentUserId, currentUserRole }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // user id being saved
  const [toast, setToast] = useState(null);
  const [dbConnected, setDbConnected] = useState(false);

  useEffect(() => {
    // Try to fetch from API first
    fetch('/api/admin/users')
      .then(r => {
        if (!r.ok) throw new Error('no-api');
        return r.json();
      })
      .then(data => {
        setUsers(data.users || []);
        setDbConnected(true);
      })
      .catch(() => {
        // Fallback: use stub data with localStorage overrides
        const localRoles = loadLocalRoles();
        const merged = STUB_USERS.map(u => ({
          ...u,
          role: localRoles?.[u.id] || u.role,
        }));
        setUsers(merged);
        setDbConnected(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleRoleChange = useCallback(async (userId, newRole) => {
    setSaving(userId);

    if (dbConnected) {
      try {
        const res = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, role: newRole }),
        });
        if (!res.ok) throw new Error('Failed');
      } catch {
        showToast('Ошибка сохранения', 'error');
        setSaving(null);
        return;
      }
    } else {
      // Save to localStorage
      const localRoles = loadLocalRoles() || {};
      localRoles[userId] = newRole;
      saveLocalRoles(localRoles);
    }

    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    showToast(`Роль обновлена`, 'ok');
    setSaving(null);
  }, [dbConnected]);

  function showToast(msg, type = 'ok') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  const roleColor = (role) => AVAILABLE_ROLES.find(r => r.value === role)?.color || '#7A8899';

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xs uppercase tracking-[0.12em] text-white/20">Администрирование</span>
        </div>
        <h1 className="text-xl font-display font-light tracking-tight">Управление ролями</h1>
        <p className="text-[13px] text-white/30 mt-1">
          Назначение ролей сотрудникам. Доступ: исполнительный директор и администраторы системы.
        </p>
      </header>

      {/* Connection status */}
      {!dbConnected && (
        <div className="mb-6 px-4 py-3 rounded-xl border border-craft-orange/20 bg-craft-orange/[0.04]">
          <div className="text-[12px] text-craft-orange font-medium mb-0.5">БД не подключена</div>
          <div className="text-[11px] text-white/30">
            Изменения ролей сохраняются в localStorage. Подключите базу данных для постоянного хранения.
          </div>
        </div>
      )}

      {/* Users table */}
      {loading ? (
        <div className="text-center py-12 text-[13px] text-white/25">Загрузка пользователей...</div>
      ) : (
        <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_160px_180px_100px] gap-3 px-5 py-3 border-b border-craft-border">
            <div className="text-2xs uppercase tracking-[0.1em] text-white/20 font-semibold">Сотрудник</div>
            <div className="text-2xs uppercase tracking-[0.1em] text-white/20 font-semibold">Email</div>
            <div className="text-2xs uppercase tracking-[0.1em] text-white/20 font-semibold">Роль</div>
            <div className="text-2xs uppercase tracking-[0.1em] text-white/20 font-semibold">Последний вход</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/[0.04]">
            {users.map(user => (
              <div
                key={user.id}
                className="grid grid-cols-[1fr_160px_180px_100px] gap-3 px-5 py-3 items-center hover:bg-white/[0.02] transition-colors"
              >
                {/* Name + avatar */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold font-display shrink-0"
                    style={{ background: roleColor(user.role) + '15', color: roleColor(user.role) }}
                  >
                    {user.name?.[0] || '?'}
                  </div>
                  <span className="text-[13px] text-white/70 truncate">{user.name}</span>
                </div>

                {/* Email */}
                <div className="text-[12px] text-white/25 truncate">{user.email}</div>

                {/* Role select */}
                <div className="relative">
                  <select
                    value={user.role}
                    onChange={e => handleRoleChange(user.id, e.target.value)}
                    disabled={saving === user.id}
                    className="w-full appearance-none bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[12px] text-white/70 cursor-pointer hover:border-white/15 focus:border-craft-accent/30 focus:outline-none transition-colors disabled:opacity-40"
                    style={{ colorScheme: 'dark' }}
                  >
                    {AVAILABLE_ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2.5 3.75L5 6.25L7.5 3.75" stroke="currentColor" strokeWidth="1.2" className="text-white/20" />
                    </svg>
                  </div>
                </div>

                {/* Last login */}
                <div className="text-[12px] text-white/20">
                  {user.last_login ? formatRelative(user.last_login) : 'Нет данных'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role legend */}
      <div className="mt-6 bg-craft-surface border border-craft-border rounded-xl px-5 py-4">
        <div className="text-2xs uppercase tracking-[0.1em] text-white/20 font-semibold mb-3">Справочник ролей</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {AVAILABLE_ROLES.map(r => (
            <div key={r.value} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />
              <span className="text-[12px] text-white/40">
                <span className="text-white/60 font-medium">{r.value}</span> — {r.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-2.5 rounded-xl border text-[13px] transition-all z-50
          ${toast.type === 'error'
            ? 'bg-craft-red/10 border-craft-red/20 text-craft-red'
            : 'bg-craft-green/10 border-craft-green/20 text-craft-green'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function formatRelative(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / (1000 * 60 * 60));
  if (diff < 1) return 'Только что';
  if (diff < 24) return `${diff}ч назад`;
  const days = Math.floor(diff / 24);
  if (days === 1) return 'Вчера';
  if (days < 7) return `${days}д назад`;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
