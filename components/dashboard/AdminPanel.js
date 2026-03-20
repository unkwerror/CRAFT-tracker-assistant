'use client';
import { useState, useEffect, useCallback } from 'react';

const TABS = [
  { id: 'users', label: 'Пользователи' },
  { id: 'roles', label: 'Роли' },
  { id: 'widgets', label: 'Виджеты' },
];

export default function AdminPanel({ currentUserId }) {
  const [tab, setTab] = useState('users');
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  return (
    <div className="min-h-screen">
      <header className="mb-6">
        <div className="text-2xs uppercase tracking-[0.12em] text-white/20 mb-1">Администрирование</div>
        <h1 className="text-xl font-display font-light tracking-tight">Управление системой</h1>
      </header>

      <nav className="flex gap-1 mb-6 border-b border-white/[0.06] pb-px">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-[13px] transition-all duration-200 border-b-2 -mb-px
              ${tab === t.id
                ? 'border-craft-accent text-white/80 font-medium'
                : 'border-transparent text-white/30 hover:text-white/50'}`}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'users' && <UsersTab showToast={showToast} currentUserId={currentUserId} />}
      {tab === 'roles' && <RolesTab showToast={showToast} />}
      {tab === 'widgets' && <WidgetsTab showToast={showToast} />}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-2.5 rounded-xl border text-[13px] animate-fadeIn z-50
          ${toast.type === 'error'
            ? 'bg-craft-red/10 border-craft-red/20 text-craft-red'
            : 'bg-craft-green/10 border-craft-green/20 text-craft-green'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function UsersTab({ showToast, currentUserId }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignModal, setAssignModal] = useState(null);

  const load = useCallback(() => {
    fetch('/api/admin/users').then(r => r.json())
      .then(data => { setUsers(data.users || []); setRoles(data.roles || []); })
      .catch(() => showToast('Ошибка загрузки', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const assignRole = useCallback(async (userId, newRole) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (!res.ok) throw new Error();
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setAssignModal(null);
      showToast('Роль назначена');
    } catch {
      showToast('Ошибка сохранения', 'error');
    }
  }, [showToast]);

  if (loading) return <Loader />;

  const grouped = roles.map(role => ({
    ...role,
    users: users.filter(u => u.role === role.key),
  })).filter(g => g.users.length > 0);

  const orphans = users.filter(u => !roles.find(r => r.key === u.role));

  return (
    <>
      <p className="text-[12px] text-white/25 mb-4">{users.length} сотрудников · {roles.length} ролей</p>

      <div className="space-y-4">
        {grouped.map(group => (
          <div key={group.key} className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-craft-border">
              <div className="w-3 h-3 rounded-full" style={{ background: group.color }} />
              <span className="text-[13px] font-medium text-white/70">{group.label}</span>
              <span className="text-2xs text-white/20">{group.users.length}</span>
              <span className="text-2xs text-white/10 ml-auto font-mono">{group.key}</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {group.users.map(user => (
                <div key={user.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/[0.02] transition-colors group">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold font-display shrink-0"
                    style={{ background: group.color + '15', color: group.color }}>
                    {user.name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-white/70 truncate">
                      {user.name}
                      {user.id === currentUserId && <span className="text-2xs text-craft-accent/40 ml-2">вы</span>}
                    </div>
                    <div className="text-[11px] text-white/20 truncate">{user.email || '—'}</div>
                  </div>
                  <div className="text-[11px] text-white/20 w-20 text-right shrink-0">
                    {user.last_login ? formatRelative(user.last_login) : '—'}
                  </div>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${user.is_active !== false ? 'bg-craft-green/50' : 'bg-white/10'}`} />
                  <button onClick={() => setAssignModal({ userId: user.id, userName: user.name })}
                    className="text-2xs text-white/15 hover:text-white/50 opacity-0 group-hover:opacity-100 transition-all px-2 py-1 rounded hover:bg-white/[0.04]">
                    Переместить
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {orphans.length > 0 && (
          <div className="bg-craft-surface border border-craft-orange/20 rounded-xl p-4">
            <div className="text-[12px] text-craft-orange mb-2">Пользователи без известной роли:</div>
            {orphans.map(u => <div key={u.id} className="text-[12px] text-white/40">{u.name} — {u.role}</div>)}
          </div>
        )}
      </div>

      {assignModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4" onClick={() => setAssignModal(null)}>
          <div className="bg-craft-surface border border-craft-border rounded-2xl w-full max-w-sm p-6 animate-fadeInScale" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-display font-medium mb-1">Назначить роль</h3>
            <p className="text-[12px] text-white/30 mb-5">{assignModal.userName}</p>
            <div className="space-y-1.5">
              {roles.map(role => {
                const isCurrent = role.key === users.find(u => u.id === assignModal.userId)?.role;
                return (
                  <button key={role.key} onClick={() => !isCurrent && assignRole(assignModal.userId, role.key)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200
                      ${isCurrent ? 'bg-white/[0.06] border border-white/[0.1]' : 'hover:bg-white/[0.04] border border-transparent'}`}>
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: role.color }} />
                    <div className="text-[13px] text-white/70 flex-1">{role.label}</div>
                    {isCurrent && <span className="text-2xs text-white/20">Текущая</span>}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setAssignModal(null)} className="w-full mt-4 py-2.5 text-[12px] text-white/30 hover:text-white/50 transition-colors">Отмена</button>
          </div>
        </div>
      )}
    </>
  );
}

function RolesTab({ showToast }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ key: '', label: '', color: '#7A8899', level: 1 });

  const load = useCallback(() => {
    fetch('/api/admin/roles').then(r => r.json())
      .then(data => setRoles(data.roles || []))
      .catch(() => showToast('Ошибка загрузки', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm({ key: '', label: '', color: '#7A8899', level: 1 }); setCreating(false); setEditing(null); };

  const handleSave = async () => {
    const method = creating ? 'POST' : 'PATCH';
    const body = creating ? form : { key: editing, label: form.label, color: form.color, level: form.level };
    try {
      const res = await fetch('/api/admin/roles', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      showToast(creating ? 'Роль создана' : 'Роль обновлена');
      resetForm();
      load();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleDelete = async (key) => {
    if (!confirm(`Удалить роль «${key}»?`)) return;
    try {
      const res = await fetch('/api/admin/roles', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      showToast('Роль удалена');
      load();
    } catch (e) { showToast(e.message, 'error'); }
  };

  if (loading) return <Loader />;
  const isEditing = creating || editing;

  return (
    <>
      {isEditing && (
        <div className="mb-5 bg-craft-surface border border-craft-accent/20 rounded-xl p-5 animate-fadeIn">
          <div className="text-[13px] font-medium text-white/60 mb-4">{creating ? 'Новая роль' : `Редактирование: ${editing}`}</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {creating && (
              <input placeholder="Ключ (латиница)" value={form.key}
                onChange={e => setForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white/70 outline-none focus:border-craft-accent/30" />
            )}
            <input placeholder="Название" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white/70 outline-none focus:border-craft-accent/30" />
            <div className="flex items-center gap-2">
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent" />
              <span className="text-2xs text-white/20 font-mono">{form.color}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xs text-white/25">Уровень:</span>
              <input type="number" min="0" max="10" value={form.level}
                onChange={e => setForm(f => ({ ...f, level: parseInt(e.target.value) || 0 }))}
                className="w-16 bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-2 text-[12px] text-white/70 outline-none focus:border-craft-accent/30" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={creating ? (!form.key || !form.label) : !form.label}
              className="px-4 py-1.5 text-[12px] bg-craft-accent/15 text-craft-accent rounded-lg hover:bg-craft-accent/25 transition-colors disabled:opacity-30">
              {creating ? 'Создать' : 'Сохранить'}
            </button>
            <button onClick={resetForm} className="px-4 py-1.5 text-[12px] text-white/25 hover:text-white/50 transition-colors">Отмена</button>
          </div>
        </div>
      )}

      {!isEditing && (
        <button onClick={() => { setCreating(true); setForm({ key: '', label: '', color: '#7A8899', level: 1 }); }}
          className="mb-4 flex items-center gap-1.5 text-[13px] text-craft-accent/50 hover:text-craft-accent px-3 py-2 rounded-lg hover:bg-craft-accent/[0.04] transition-all">
          <PlusIcon /> Создать роль
        </button>
      )}

      <div className="space-y-2">
        {roles.map(role => (
          <div key={role.key} className="bg-craft-surface border border-craft-border rounded-xl px-5 py-3.5 flex items-center gap-4 hover:border-craft-border2 transition-colors">
            <div className="w-4 h-4 rounded-md shrink-0" style={{ background: role.color }} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-white/70">{role.label}</div>
              <div className="text-2xs text-white/20 font-mono">{role.key} · уровень {role.level}</div>
            </div>
            {role.is_system && <span className="text-2xs text-white/10 px-2 py-0.5 rounded bg-white/[0.03]">системная</span>}
            <button onClick={() => { setEditing(role.key); setForm({ key: role.key, label: role.label, color: role.color, level: role.level }); }}
              className="text-2xs text-white/20 hover:text-white/50 px-2 py-1 rounded hover:bg-white/[0.04] transition-all">Изм.</button>
            {!role.is_system && (
              <button onClick={() => handleDelete(role.key)}
                className="text-2xs text-craft-red/20 hover:text-craft-red/60 px-2 py-1 rounded hover:bg-craft-red/[0.04] transition-all">Удал.</button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function WidgetsTab({ showToast }) {
  const [widgets, setWidgets] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/widgets').then(r => r.json()),
      fetch('/api/admin/roles').then(r => r.json()),
    ]).then(([wData, rData]) => {
      setWidgets(wData.widgets || []);
      setRoles(rData.roles || []);
    }).catch(() => showToast('Ошибка загрузки', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const toggleRole = useCallback(async (widgetKey, roleKey, field) => {
    const widget = widgets.find(w => w.key === widgetKey);
    if (!widget) return;
    const key = `${widgetKey}-${roleKey}-${field}`;
    setSaving(key);

    const current = widget[field] || [];
    const hasAll = current.includes('*');
    const hasRole = current.includes(roleKey);

    let next;
    if (hasAll) {
      next = roles.map(r => r.key).filter(k => k !== roleKey);
    } else if (hasRole) {
      next = current.filter(k => k !== roleKey);
    } else {
      next = [...current, roleKey];
    }
    if (next.length >= roles.length) next = ['*'];

    try {
      const res = await fetch('/api/admin/widgets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgetKey, field, roles: next }),
      });
      if (!res.ok) throw new Error();
      setWidgets(prev => prev.map(w => w.key === widgetKey ? { ...w, [field]: next } : w));
    } catch { showToast('Ошибка сохранения', 'error'); }
    setSaving(null);
  }, [widgets, roles, showToast]);

  const isOn = (list, roleKey) => list?.includes('*') || list?.includes(roleKey);

  if (loading) return <Loader />;

  return (
    <>
      <p className="text-[12px] text-white/25 mb-4">Доступ — видит в пикере. По умолчанию — включён при первом входе.</p>
      <div className="bg-craft-surface border border-craft-border rounded-xl overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-craft-border">
              <th className="text-left text-2xs text-white/20 font-semibold px-4 py-3 sticky left-0 bg-craft-surface z-10">Виджет</th>
              {roles.map(r => (
                <th key={r.key} className="text-center px-2 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                    <span className="text-2xs text-white/25">{r.key}</span>
                  </div>
                  <div className="flex justify-center gap-2 mt-1 text-2xs text-white/10">
                    <span>A</span><span>D</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {widgets.map(w => (
              <tr key={w.key} className="hover:bg-white/[0.015] transition-colors">
                <td className="px-4 py-2.5 sticky left-0 bg-craft-surface z-10">
                  <div className="text-[12px] text-white/50">{w.title}</div>
                </td>
                {roles.map(r => (
                  <td key={r.key} className="text-center px-2 py-2.5">
                    <div className="flex justify-center gap-2">
                      <MiniCheck on={isOn(w.allowed_roles, r.key)} color={r.color}
                        loading={saving === `${w.key}-${r.key}-allowed_roles`}
                        onClick={() => toggleRole(w.key, r.key, 'allowed_roles')} />
                      <MiniCheck on={isOn(w.default_for, r.key)} color={r.color} dimmed
                        loading={saving === `${w.key}-${r.key}-default_for`}
                        onClick={() => toggleRole(w.key, r.key, 'default_for')} />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex gap-4 text-2xs text-white/15">
        <span>A — доступ (видит в пикере)</span>
        <span>D — по умолчанию (включён при первом входе)</span>
      </div>
    </>
  );
}

function MiniCheck({ on, color, dimmed, loading, onClick }) {
  return (
    <button onClick={onClick} disabled={loading}
      className={`w-5 h-5 rounded transition-all duration-150 flex items-center justify-center ${loading ? 'opacity-30' : ''}`}
      style={on ? { background: color + (dimmed ? '15' : '25'), border: `1px solid ${color}40` } : { background: 'transparent', border: '1px solid rgba(255,255,255,0.08)' }}>
      {on && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="2"><path d="M2.5 6L5 8.5L9.5 3.5" /></svg>}
    </button>
  );
}

function Loader() {
  return <div className="flex justify-center py-16"><div className="w-5 h-5 border-2 border-white/5 border-t-white/20 rounded-full animate-spin" /></div>;
}

function PlusIcon() {
  return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" /></svg>;
}

function formatRelative(dateStr) {
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 3600000);
  if (diff < 1) return 'Сейчас';
  if (diff < 24) return `${diff}ч`;
  const days = Math.floor(diff / 24);
  if (days === 1) return 'Вчера';
  if (days < 7) return `${days}д`;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
