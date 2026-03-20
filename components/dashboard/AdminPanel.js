'use client';
import { useState, useEffect, useCallback } from 'react';

const TABS = [
  { id: 'users', label: 'Пользователи' },
  { id: 'roles', label: 'Роли' },
  { id: 'widgets', label: 'Виджеты' },
];

export default function AdminPanel({ currentUserId, currentUserRole }) {
  const [tab, setTab] = useState('users');
  const [toast, setToast] = useState(null);

  function showToast(msg, type = 'ok') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  return (
    <div className="min-h-screen">
      <header className="mb-6">
        <div className="text-2xs uppercase tracking-[0.12em] text-white/20 mb-1">Администрирование</div>
        <h1 className="text-xl font-display font-light tracking-tight">Управление системой</h1>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-[13px] transition-all duration-200
              ${tab === t.id ? 'bg-white/[0.08] text-white/80 font-medium' : 'text-white/30 hover:text-white/50 hover:bg-white/[0.03]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab showToast={showToast} currentUserId={currentUserId} />}
      {tab === 'roles' && <RolesTab showToast={showToast} />}
      {tab === 'widgets' && <WidgetsTab showToast={showToast} />}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-2.5 rounded-xl border text-[13px] animate-fadeIn z-50
          ${toast.type === 'error' ? 'bg-craft-red/10 border-craft-red/20 text-craft-red' : 'bg-craft-green/10 border-craft-green/20 text-craft-green'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════
// TAB 1: Users
// ══════════════════════════════════════

function UsersTab({ showToast, currentUserId }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(data => {
        setUsers(data.users || []);
        setRoles(data.roles || []);
      })
      .catch(() => showToast('Ошибка загрузки пользователей', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleRoleChange = useCallback(async (userId, newRole) => {
    setSaving(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (!res.ok) throw new Error();
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showToast('Роль обновлена');
    } catch {
      showToast('Ошибка сохранения', 'error');
    }
    setSaving(null);
  }, []);

  const roleColor = (key) => roles.find(r => r.key === key)?.color || '#7A8899';

  if (loading) return <div className="text-center py-12 text-[13px] text-white/25">Загрузка...</div>;

  return (
    <>
      <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_160px_180px_100px] gap-3 px-5 py-3 border-b border-craft-border">
          <div className="text-2xs uppercase tracking-[0.1em] text-white/20 font-semibold">Сотрудник</div>
          <div className="text-2xs uppercase tracking-[0.1em] text-white/20 font-semibold">Email</div>
          <div className="text-2xs uppercase tracking-[0.1em] text-white/20 font-semibold">Роль</div>
          <div className="text-2xs uppercase tracking-[0.1em] text-white/20 font-semibold">Последний вход</div>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {users.map(user => (
            <div key={user.id} className="grid grid-cols-[1fr_160px_180px_100px] gap-3 px-5 py-3 items-center hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold font-display shrink-0"
                  style={{ background: roleColor(user.role) + '15', color: roleColor(user.role) }}>
                  {user.name?.[0] || '?'}
                </div>
                <span className="text-[13px] text-white/70 truncate">{user.name}</span>
              </div>
              <div className="text-[12px] text-white/25 truncate">{user.email || '—'}</div>
              <div className="relative">
                <select value={user.role} onChange={e => handleRoleChange(user.id, e.target.value)}
                  disabled={saving === user.id}
                  className="w-full appearance-none bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[12px] text-white/70 cursor-pointer hover:border-white/15 focus:border-craft-accent/30 focus:outline-none transition-colors disabled:opacity-40"
                  style={{ colorScheme: 'dark' }}>
                  {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2.5 3.75L5 6.25L7.5 3.75" stroke="currentColor" strokeWidth="1.2" className="text-white/20" /></svg>
                </div>
              </div>
              <div className="text-[12px] text-white/20">{user.last_login ? formatRelative(user.last_login) : '—'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Role legend */}
      <div className="mt-6 bg-craft-surface border border-craft-border rounded-xl px-5 py-4">
        <div className="text-2xs uppercase tracking-[0.1em] text-white/20 font-semibold mb-3">Справочник ролей</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {roles.map(r => (
            <div key={r.key} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />
              <span className="text-[12px] text-white/40">
                <span className="text-white/60 font-medium">{r.key}</span> — {r.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}


// ══════════════════════════════════════
// TAB 2: Roles
// ══════════════════════════════════════

function RolesTab({ showToast }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ key: '', label: '', color: '#7A8899', level: 1 });

  const loadRoles = () => {
    fetch('/api/admin/roles').then(r => r.json())
      .then(data => setRoles(data.roles || []))
      .catch(() => showToast('Ошибка загрузки ролей', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRoles(); }, []);

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      showToast('Роль создана');
      setCreating(false);
      setForm({ key: '', label: '', color: '#7A8899', level: 1 });
      loadRoles();
    } catch (e) {
      showToast(e.message || 'Ошибка создания', 'error');
    }
  };

  const handleUpdate = async (key) => {
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, ...form }),
      });
      if (!res.ok) throw new Error();
      showToast('Роль обновлена');
      setEditing(null);
      loadRoles();
    } catch {
      showToast('Ошибка обновления', 'error');
    }
  };

  const handleDelete = async (key) => {
    if (!confirm(`Удалить роль "${key}"? Действие необратимо.`)) return;
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      showToast('Роль удалена');
      loadRoles();
    } catch (e) {
      showToast(e.message || 'Ошибка удаления', 'error');
    }
  };

  if (loading) return <div className="text-center py-12 text-[13px] text-white/25">Загрузка...</div>;

  return (
    <>
      {/* Create button */}
      {!creating && (
        <button onClick={() => setCreating(true)}
          className="mb-4 flex items-center gap-1.5 text-[13px] text-craft-accent/60 hover:text-craft-accent px-3 py-2 rounded-lg hover:bg-craft-accent/[0.05] transition-all">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" /></svg>
          Создать роль
        </button>
      )}

      {/* Create form */}
      {creating && (
        <div className="mb-4 bg-craft-surface border border-craft-accent/20 rounded-xl p-5">
          <div className="text-[13px] font-medium text-white/60 mb-3">Новая роль</div>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <input placeholder="Ключ (латиница)" value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
              className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white/70 outline-none focus:border-craft-accent/30" />
            <input placeholder="Название" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white/70 outline-none focus:border-craft-accent/30" />
            <div className="flex items-center gap-2">
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent" />
              <span className="text-[11px] text-white/30">{form.color}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-white/30">Уровень:</label>
              <input type="number" min="1" max="10" value={form.level} onChange={e => setForm(f => ({ ...f, level: parseInt(e.target.value) || 1 }))}
                className="w-16 bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-2 text-[12px] text-white/70 outline-none focus:border-craft-accent/30" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={!form.key || !form.label}
              className="px-4 py-1.5 text-[12px] bg-craft-accent/20 text-craft-accent rounded-lg hover:bg-craft-accent/30 transition-colors disabled:opacity-30">
              Создать
            </button>
            <button onClick={() => { setCreating(false); setForm({ key: '', label: '', color: '#7A8899', level: 1 }); }}
              className="px-4 py-1.5 text-[12px] text-white/30 hover:text-white/50 transition-colors">
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Roles table */}
      <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[60px_120px_1fr_80px_80px_100px] gap-3 px-5 py-3 border-b border-craft-border">
          <div className="text-2xs uppercase tracking-[0.1em] text-white/20 font-semibold">Цвет</div>
          <div className="text-2xs uppercase tracking-[0.1em] text-white/20 font-semibold">Ключ</div>
          <div className="text-2xs uppercase tracking-[0.1em] text-white/20 font-semibold">Название</div>
          <div className="text-2xs uppercase tracking-[0.1em] text-white/20 font-semibold">Уровень</div>
          <div className="text-2xs uppercase tracking-[0.1em] text-white/20 font-semibold">Системная</div>
          <div className="text-2xs uppercase tracking-[0.1em] text-white/20 font-semibold">Действия</div>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {roles.map(role => (
            <div key={role.key} className="grid grid-cols-[60px_120px_1fr_80px_80px_100px] gap-3 px-5 py-3 items-center hover:bg-white/[0.02] transition-colors">
              <div className="w-5 h-5 rounded-md" style={{ background: role.color }} />
              <div className="text-[12px] text-white/50 font-mono">{role.key}</div>
              {editing === role.key ? (
                <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  className="bg-white/[0.05] border border-craft-accent/30 rounded-lg px-3 py-1 text-[12px] text-white/70 outline-none" />
              ) : (
                <div className="text-[13px] text-white/70">{role.label}</div>
              )}
              <div className="text-[12px] text-white/30">{role.level}</div>
              <div className="text-[12px] text-white/20">{role.is_system ? 'Да' : 'Нет'}</div>
              <div className="flex gap-1.5">
                {editing === role.key ? (
                  <>
                    <button onClick={() => handleUpdate(role.key)}
                      className="text-[11px] text-craft-green/60 hover:text-craft-green transition-colors">Сохранить</button>
                    <button onClick={() => setEditing(null)}
                      className="text-[11px] text-white/30 hover:text-white/50 transition-colors">Отмена</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditing(role.key); setForm({ key: role.key, label: role.label, color: role.color, level: role.level }); }}
                      className="text-[11px] text-white/30 hover:text-white/60 transition-colors">Изм.</button>
                    {!role.is_system && (
                      <button onClick={() => handleDelete(role.key)}
                        className="text-[11px] text-craft-red/30 hover:text-craft-red transition-colors">Удал.</button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}


// ══════════════════════════════════════
// TAB 3: Widgets
// ══════════════════════════════════════

function WidgetsTab({ showToast }) {
  const [widgets, setWidgets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    fetch('/api/admin/widgets').then(r => r.json())
      .then(data => {
        setWidgets(data.widgets || []);
        setUsers(data.users || []);
      })
      .catch(() => showToast('Ошибка загрузки виджетов', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = useCallback(async (userId, widgetId, currentEnabled) => {
    const key = `${userId}-${widgetId}`;
    setSaving(key);
    try {
      const res = await fetch('/api/admin/widgets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, widgetId, enabled: !currentEnabled }),
      });
      if (!res.ok) throw new Error();
      setUsers(prev => prev.map(u => {
        if (u.user_id !== userId) return u;
        return {
          ...u,
          widgets: { ...u.widgets, [widgetId]: { ...u.widgets[widgetId], enabled: !currentEnabled } }
        };
      }));
    } catch {
      showToast('Ошибка сохранения', 'error');
    }
    setSaving(null);
  }, []);

  if (loading) return <div className="text-center py-12 text-[13px] text-white/25">Загрузка...</div>;

  return (
    <>
      <p className="text-[12px] text-white/25 mb-4">Включите или выключите виджеты для каждого пользователя. Изменения применяются мгновенно.</p>

      <div className="bg-craft-surface border border-craft-border rounded-xl overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-craft-border">
              <th className="text-left text-2xs uppercase tracking-[0.1em] text-white/20 font-semibold px-4 py-3 sticky left-0 bg-craft-surface">
                Сотрудник
              </th>
              {widgets.map(w => (
                <th key={w.key} className="text-center text-2xs uppercase tracking-[0.08em] text-white/20 font-semibold px-2 py-3 whitespace-nowrap">
                  <div className="truncate max-w-[80px]" title={w.title}>{w.title}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {users.map(user => (
              <tr key={user.user_id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-2.5 sticky left-0 bg-craft-surface">
                  <div className="flex items-center gap-2 min-w-[140px]">
                    <span className="text-[12px] text-white/60 truncate">{user.name}</span>
                    <span className="text-2xs text-white/15">{user.role}</span>
                  </div>
                </td>
                {widgets.map(w => {
                  const access = user.widgets?.[w.key];
                  const enabled = access?.enabled || false;
                  const key = `${user.user_id}-${w.key}`;
                  const isSaving = saving === key;

                  return (
                    <td key={w.key} className="text-center px-2 py-2.5">
                      <button
                        onClick={() => handleToggle(user.user_id, w.key, enabled)}
                        disabled={isSaving}
                        className={`w-6 h-6 rounded-md border transition-all duration-200 flex items-center justify-center
                          ${enabled
                            ? 'bg-craft-accent/20 border-craft-accent/40 text-craft-accent'
                            : 'bg-white/[0.02] border-white/[0.08] text-transparent hover:border-white/15'
                          } ${isSaving ? 'opacity-30' : ''}`}
                      >
                        {enabled && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2.5 6L5 8.5L9.5 3.5" />
                          </svg>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Widget legend */}
      <div className="mt-4 bg-craft-surface border border-craft-border rounded-xl px-5 py-4">
        <div className="text-2xs uppercase tracking-[0.1em] text-white/20 font-semibold mb-3">Справочник виджетов</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {widgets.map(w => (
            <div key={w.key} className="flex items-start gap-2">
              <span className={`text-2xs mt-0.5 px-1.5 py-0.5 rounded ${w.size === 'full' ? 'bg-craft-purple/10 text-craft-purple/50' : 'bg-white/5 text-white/25'}`}>
                {w.size === 'full' ? 'wide' : 'half'}
              </span>
              <div>
                <div className="text-[12px] text-white/50">{w.title}</div>
                <div className="text-[11px] text-white/20">{w.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}


// ── Helpers ──

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
