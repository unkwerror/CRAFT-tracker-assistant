'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Permission catalogue ────────────────────────────────────────────────────
const ALL_PERMISSIONS = [
  { key: 'crm:read',           label: 'Чтение',          domain: 'CRM' },
  { key: 'crm:write',          label: 'Запись',           domain: 'CRM' },
  { key: 'crm:export',         label: 'Экспорт',          domain: 'CRM' },
  { key: 'crm:transition',     label: 'Переходы',         domain: 'CRM' },
  { key: 'tracker:read',       label: 'Чтение',           domain: 'Трекер' },
  { key: 'tracker:write',      label: 'Запись',           domain: 'Трекер' },
  { key: 'proj:read',          label: 'Чтение',           domain: 'Проекты' },
  { key: 'proj:write',         label: 'Запись',           domain: 'Проекты' },
  { key: 'docs:read',          label: 'Чтение',           domain: 'Документы' },
  { key: 'docs:write',         label: 'Запись',           domain: 'Документы' },
  { key: 'hr:read',            label: 'Чтение',           domain: 'Кадры' },
  { key: 'hr:write',           label: 'Запись',           domain: 'Кадры' },
  { key: 'admin:panel',        label: 'Панель',           domain: 'Админ' },
  { key: 'admin:users',        label: 'Пользователи',     domain: 'Админ' },
  { key: 'admin:roles',        label: 'Роли',             domain: 'Админ' },
  { key: 'admin:widgets',      label: 'Виджеты',          domain: 'Админ' },
  { key: 'dashboard:customize', label: 'Кастомизация',   domain: 'Дашборд' },
];

const DOMAIN_CLS = {
  'CRM':        'bg-craft-cyan/15 text-craft-cyan',
  'Трекер':     'bg-craft-accent/15 text-craft-accent',
  'Проекты':    'bg-craft-green/15 text-craft-green',
  'Документы':  'bg-craft-orange/15 text-craft-orange',
  'Кадры':      'bg-craft-purple/15 text-craft-purple',
  'Админ':      'bg-craft-red/15 text-craft-red',
  'Дашборд':    'bg-white/[0.06] text-craft-muted',
  'Прочее':     'bg-white/[0.04] text-white/30',
};

function permDomain(key) {
  return ALL_PERMISSIONS.find(p => p.key === key)?.domain || 'Прочее';
}
function permLabel(key) {
  return ALL_PERMISSIONS.find(p => p.key === key)?.label || key;
}

// ── Widget icons (same shapes as WidgetPickerModal) ──────────────────────────
const WIDGET_ICON_PATHS = {
  stats_bar:        <><rect x="2" y="10" width="3" height="6"/><rect x="7" y="6" width="3" height="10"/><rect x="12" y="3" width="3" height="13"/></>,
  tasks_my:         <><rect x="4" y="3" width="8" height="1.5" rx="0.75"/><rect x="4" y="7" width="8" height="1.5" rx="0.75"/><rect x="4" y="11" width="5" height="1.5" rx="0.75"/><circle cx="2" cy="3.75" r="1"/><circle cx="2" cy="7.75" r="1"/><circle cx="2" cy="11.75" r="1"/></>,
  kanban_crm:       <><rect x="1" y="2" width="4" height="12" rx="1"/><rect x="6" y="2" width="4" height="8" rx="1"/><rect x="11" y="2" width="4" height="10" rx="1"/></>,
  tasks_crm:        <><path d="M2 3h12v3H2zM4 6h8v3H4zM6 9h4v3H6z"/></>,
  tasks_proj:       <><path d="M2 4h5v8H2zM9 4h5v8H9z"/></>,
  funnel_crm:       <><path d="M1 2h14l-5 6v5l-4-2V8L1 2z"/></>,
  quick_links:      <><path d="M7 9a3 3 0 0 1 0-4.24L9.17 2.6A3 3 0 0 1 13.4 6.8L11.23 9"/><path d="M9 7a3 3 0 0 1 0 4.24L6.83 13.4A3 3 0 0 1 2.6 9.2L4.77 7"/></>,
  onboarding:       <><path d="M8 2l1.5 3 3.5.5-2.5 2.5.5 3.5L8 10l-3 1.5.5-3.5L3 5.5 6.5 5 8 2z"/></>,
  audit:            <><path d="M8 2L2 5v5a7 7 0 0 0 6 6.9A7 7 0 0 0 14 10V5L8 2z"/><path d="M6 8l1.5 1.5 3-3"/></>,
  portfolio_summary:<><rect x="1" y="3" width="6" height="10" rx="1"/><rect x="9" y="3" width="6" height="5" rx="1"/><rect x="9" y="10" width="6" height="3" rx="1"/></>,
  team_onboarding:  <><circle cx="5" cy="5" r="2"/><circle cx="11" cy="5" r="2"/><path d="M1 13a4 4 0 0 1 8 0M7 13a4 4 0 0 1 8 0"/></>,
  system_status:    <><rect x="2" y="3" width="12" height="9" rx="1"/><path d="M5 15h6M8 12v3"/><circle cx="8" cy="7" r="1.5" fill="currentColor"/></>,
  crm_analytics:    <><path d="M2 13l3-5 3 2 3-6 3 4"/><path d="M2 13h12"/></>,
  crm_timeline:     <><line x1="4" y1="4" x2="4" y2="12"/><circle cx="4" cy="4" r="1.5" fill="currentColor"/><circle cx="4" cy="8" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><line x1="7" y1="4" x2="14" y2="4"/><line x1="7" y1="8" x2="12" y2="8"/><line x1="7" y1="12" x2="13" y2="12"/></>,
  lead_aging:       <><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/></>,
};

function WidgetIcon({ widgetKey, className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      {WIDGET_ICON_PATHS[widgetKey] || <rect x="2" y="2" width="12" height="12" rx="2"/>}
    </svg>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'users',   label: 'Пользователи' },
  { id: 'roles',   label: 'Роли' },
  { id: 'widgets', label: 'Виджеты' },
];

export default function AdminPanel({ currentUserId }) {
  const [tab, setTab]     = useState('users');
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

      {tab === 'users'   && <UsersTab showToast={showToast} currentUserId={currentUserId} />}
      {tab === 'roles'   && <RolesTab showToast={showToast} />}
      {tab === 'widgets' && <WidgetsTab showToast={showToast} />}

      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={`fixed bottom-6 right-6 px-4 py-2.5 rounded-xl border text-[13px] z-50
              ${toast.type === 'error'
                ? 'bg-craft-red/10 border-craft-red/20 text-craft-red'
                : 'bg-craft-green/10 border-craft-green/20 text-craft-green'}`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// USERS TAB — unchanged
// ════════════════════════════════════════════════════════════════════
function UsersTab({ showToast, currentUserId }) {
  const [users, setUsers]           = useState([]);
  const [roles, setRoles]           = useState([]);
  const [loading, setLoading]       = useState(true);
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
          <div className="bg-craft-surface border border-craft-border rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
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

// ════════════════════════════════════════════════════════════════════
// ROLES TAB — capability tag cards
// ════════════════════════════════════════════════════════════════════
function RolesTab({ showToast }) {
  const [roles, setRoles]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing]   = useState(null); // role.key being edited
  const [form, setForm]         = useState({ key: '', label: '', color: '#7A8899', level: 1 });

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
    const body = creating
      ? form
      : { key: editing, label: form.label, color: form.color, level: form.level };
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

  const updatePermissions = useCallback(async (roleKey, permissions) => {
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: roleKey, permissions }),
      });
      if (!res.ok) throw new Error();
      setRoles(prev => prev.map(r => r.key === roleKey ? { ...r, permissions } : r));
      showToast('Права обновлены');
    } catch {
      showToast('Ошибка сохранения', 'error');
    }
  }, [showToast]);

  if (loading) return <Loader />;
  const isEditing = creating || editing;

  return (
    <>
      {/* Create/edit form */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <div className="bg-craft-surface border border-craft-accent/20 rounded-xl p-5">
              <div className="text-[13px] font-medium text-white/60 mb-4">
                {creating ? 'Новая роль' : `Редактирование: ${editing}`}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {creating && (
                  <input placeholder="Ключ (латиница)" value={form.key}
                    onChange={e => setForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                    className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white/70 outline-none focus:border-craft-accent/30" />
                )}
                <input placeholder="Название" value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white/70 outline-none focus:border-craft-accent/30" />
                <div className="flex items-center gap-2">
                  <input type="color" value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
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
          </motion.div>
        )}
      </AnimatePresence>

      {!isEditing && (
        <button
          onClick={() => { setCreating(true); setForm({ key: '', label: '', color: '#7A8899', level: 1 }); }}
          className="mb-5 flex items-center gap-1.5 text-[13px] text-craft-accent/50 hover:text-craft-accent px-3 py-2 rounded-lg hover:bg-craft-accent/[0.04] transition-all"
        >
          <PlusIcon /> Создать роль
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {roles.map(role => (
          <RoleCard
            key={role.key}
            role={role}
            onEdit={() => { setEditing(role.key); setForm({ key: role.key, label: role.label, color: role.color, level: role.level }); }}
            onDelete={() => handleDelete(role.key)}
            onUpdatePermissions={updatePermissions}
          />
        ))}
      </div>
    </>
  );
}

function RoleCard({ role, onEdit, onDelete, onUpdatePermissions }) {
  const [showAddPerm, setShowAddPerm] = useState(false);
  const popoverRef = useRef(null);

  const permissions = Array.isArray(role.permissions) ? role.permissions : [];
  const queues      = Array.isArray(role.queues) ? role.queues : [];

  // Group permissions by domain
  const grouped = {};
  for (const perm of permissions) {
    const domain = permDomain(perm);
    if (!grouped[domain]) grouped[domain] = [];
    grouped[domain].push(perm);
  }

  const availablePerms = ALL_PERMISSIONS.filter(p => !permissions.includes(p.key));

  const removePerm = (permKey) => {
    onUpdatePermissions(role.key, permissions.filter(p => p !== permKey));
  };
  const addPerm = (permKey) => {
    onUpdatePermissions(role.key, [...permissions, permKey]);
    setShowAddPerm(false);
  };

  // Close popover on outside click
  useEffect(() => {
    if (!showAddPerm) return;
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setShowAddPerm(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddPerm]);

  return (
    <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden relative hover:border-craft-border2 transition-colors">
      {/* Left color bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: role.color }} />

      <div className="pl-5 pr-4 py-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-medium text-white/80">{role.label}</span>
              {role.is_system && (
                <span
                  title="Системная роль — структура нередактируема"
                  className="text-2xs px-1.5 py-0.5 rounded bg-white/[0.04] text-white/25 cursor-help"
                >
                  🔒 системная
                </span>
              )}
            </div>
            <div className="text-2xs text-white/20 font-mono mt-0.5">{role.key} · уровень {role.level}</div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onEdit}
              className="text-2xs text-white/20 hover:text-white/50 px-2 py-1 rounded hover:bg-white/[0.04] transition-all"
            >
              Изм.
            </button>
            {!role.is_system && (
              <button
                onClick={onDelete}
                className="text-2xs text-craft-red/25 hover:text-craft-red/60 px-2 py-1 rounded hover:bg-craft-red/[0.04] transition-all"
              >
                Удал.
              </button>
            )}
          </div>
        </div>

        {/* Permission groups */}
        {Object.keys(grouped).length > 0 ? (
          <div className="space-y-1.5 mb-3">
            {Object.entries(grouped).map(([domain, perms]) => (
              <div key={domain} className="flex flex-wrap items-center gap-1.5">
                <span className="text-2xs text-white/20 shrink-0 w-20">{domain}:</span>
                <div className="flex flex-wrap gap-1">
                  {perms.map(perm => (
                    <span
                      key={perm}
                      className={`inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full ${DOMAIN_CLS[domain] || DOMAIN_CLS['Прочее']}`}
                    >
                      {permLabel(perm)}
                      {!role.is_system && (
                        <button
                          onClick={() => removePerm(perm)}
                          className="opacity-40 hover:opacity-100 leading-none ml-0.5 transition-opacity"
                          title={`Убрать ${perm}`}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-2xs text-white/15 italic mb-3">Нет назначенных прав</div>
        )}

        {/* Queues row */}
        {queues.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span className="text-2xs text-white/15 shrink-0 w-20">Очереди:</span>
            <div className="flex flex-wrap gap-1">
              {queues.map(q => (
                <span key={q} className="text-2xs px-2 py-0.5 rounded-full bg-white/[0.04] text-white/30 font-mono">{q}</span>
              ))}
            </div>
          </div>
        )}

        {/* Add permission */}
        {!role.is_system && availablePerms.length > 0 && (
          <div className="relative" ref={popoverRef}>
            <button
              onClick={() => setShowAddPerm(v => !v)}
              className="text-2xs text-craft-accent/50 hover:text-craft-accent flex items-center gap-1 transition-colors"
            >
              <span className="text-base leading-none">+</span> Добавить право
            </button>
            <AnimatePresence>
              {showAddPerm && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute bottom-full left-0 mb-2 z-30 glass-modal border border-craft-border rounded-xl p-3 shadow-xl w-64"
                >
                  <div className="text-2xs text-white/25 mb-2">Добавить право доступа</div>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {Object.entries(
                      availablePerms.reduce((acc, p) => {
                        (acc[p.domain] = acc[p.domain] || []).push(p);
                        return acc;
                      }, {})
                    ).map(([domain, perms]) => (
                      <div key={domain}>
                        <div className="text-2xs text-white/20 mb-1">{domain}</div>
                        <div className="flex flex-wrap gap-1">
                          {perms.map(p => (
                            <button
                              key={p.key}
                              onClick={() => addPerm(p.key)}
                              className={`text-2xs px-2 py-0.5 rounded-full border transition-colors hover:opacity-80 ${DOMAIN_CLS[domain] || DOMAIN_CLS['Прочее']} border-current/20`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// WIDGETS TAB — card grid with 3-state role pills
// ════════════════════════════════════════════════════════════════════
function WidgetsTab({ showToast }) {
  const [widgets, setWidgets] = useState([]);
  const [roles, setRoles]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null);

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

  // Resolve '*' wildcard to actual role keys
  const resolveList = useCallback((list) => {
    if (!list) return [];
    if (list.includes('*')) return roles.map(r => r.key);
    return list;
  }, [roles]);

  const normalizeList = useCallback((keys) => {
    if (keys.length >= roles.length && roles.length > 0) return ['*'];
    return keys;
  }, [roles]);

  const saveField = useCallback(async (widgetKey, field, rolesList) => {
    const key = `${widgetKey}-${field}`;
    setSaving(key);
    try {
      const res = await fetch('/api/admin/widgets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgetKey, field, roles: normalizeList(rolesList) }),
      });
      if (!res.ok) throw new Error();
      setWidgets(prev => prev.map(w => w.key === widgetKey
        ? { ...w, [field]: normalizeList(rolesList) }
        : w
      ));
    } catch {
      showToast('Ошибка сохранения', 'error');
    } finally {
      setSaving(null);
    }
  }, [normalizeList, showToast]);

  // 3-state cycle: none → allowed → default → none
  const cycleRolePill = useCallback(async (widgetKey, roleKey) => {
    const widget   = widgets.find(w => w.key === widgetKey);
    if (!widget) return;
    const allowed  = resolveList(widget.allowed_roles);
    const defaults = resolveList(widget.default_for);
    const isAllowed = allowed.includes(roleKey);
    const isDefault = defaults.includes(roleKey);

    if (!isAllowed) {
      // none → allowed
      await saveField(widgetKey, 'allowed_roles', [...allowed, roleKey]);
    } else if (isAllowed && !isDefault) {
      // allowed → default (also ensures allowed stays)
      await saveField(widgetKey, 'default_for', [...defaults, roleKey]);
    } else {
      // default → none: remove from both
      await saveField(widgetKey, 'allowed_roles', allowed.filter(k => k !== roleKey));
      await saveField(widgetKey, 'default_for',   defaults.filter(k => k !== roleKey));
    }
  }, [widgets, resolveList, saveField]);

  const toggleActive = useCallback(async (widgetKey, current) => {
    const key = `${widgetKey}-active`;
    setSaving(key);
    try {
      const res = await fetch('/api/admin/widgets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgetKey, is_active: !current }),
      });
      if (!res.ok) throw new Error();
      setWidgets(prev => prev.map(w => w.key === widgetKey ? { ...w, is_active: !current } : w));
    } catch {
      showToast('Ошибка сохранения', 'error');
    } finally {
      setSaving(null);
    }
  }, [showToast]);

  if (loading) return <Loader />;

  return (
    <>
      <p className="text-[12px] text-white/25 mb-4">
        Клик по пилюле роли: <span className="text-white/40">нет доступа</span> → <span className="text-craft-accent">доступ</span> → <span className="text-craft-accent">доступ ★</span> (по умолчанию) → <span className="text-white/40">нет доступа</span>
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {widgets.map(w => (
          <WidgetCard
            key={w.key}
            widget={w}
            roles={roles}
            resolveList={resolveList}
            onCycle={cycleRolePill}
            onToggleActive={toggleActive}
            saving={saving}
          />
        ))}
      </div>
    </>
  );
}

function WidgetCard({ widget, roles, resolveList, onCycle, onToggleActive, saving }) {
  const allowed  = resolveList(widget.allowed_roles);
  const defaults = resolveList(widget.default_for);
  const isActiveLoading = saving === `${widget.key}-active`;

  return (
    <div className={`bg-craft-surface border border-craft-border rounded-xl p-4 flex flex-col gap-3 transition-colors ${
      widget.is_active ? 'hover:border-craft-border2' : 'opacity-60'
    }`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 text-white/40">
          <WidgetIcon widgetKey={widget.key} className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-white/75 truncate">{widget.title}</div>
          <div className="text-2xs text-white/25 leading-snug mt-0.5 line-clamp-2">{widget.description}</div>
        </div>
        {/* is_active toggle */}
        <button
          onClick={() => onToggleActive(widget.key, widget.is_active)}
          disabled={isActiveLoading}
          title={widget.is_active ? 'Отключить виджет' : 'Включить виджет'}
          className={`shrink-0 w-9 h-5 rounded-full border transition-all duration-200 relative ${
            isActiveLoading ? 'opacity-40' :
            widget.is_active
              ? 'bg-craft-accent/30 border-craft-accent/40'
              : 'bg-white/[0.04] border-white/[0.08]'
          }`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 ${
            widget.is_active
              ? 'left-4 bg-craft-accent'
              : 'left-0.5 bg-white/25'
          }`} />
        </button>
      </div>

      {/* Size badge */}
      <div>
        <span className="text-2xs px-2 py-0.5 rounded-full bg-white/[0.04] text-white/25">
          {widget.size === 'full' ? '▬ Широкий' : '▪ Половина'}
        </span>
      </div>

      {/* Role pills */}
      <div className="flex flex-wrap gap-1.5">
        {roles.map(role => {
          const isAllowed = allowed.includes(role.key);
          const isDefault = defaults.includes(role.key);
          const isLoading = saving === `${widget.key}-allowed_roles` || saving === `${widget.key}-default_for`;

          return (
            <button
              key={role.key}
              onClick={() => onCycle(widget.key, role.key)}
              disabled={isLoading}
              title={isDefault ? `${role.label}: по умолчанию` : isAllowed ? `${role.label}: доступ` : `${role.label}: нет доступа`}
              className={`text-2xs px-2 py-0.5 rounded-full border transition-all duration-150 ${
                isLoading ? 'opacity-40' : ''
              } ${
                isDefault
                  ? 'font-medium'
                  : isAllowed
                    ? ''
                    : 'border-white/[0.08] text-white/20 bg-transparent'
              }`}
              style={isAllowed ? {
                background: role.color + (isDefault ? '28' : '18'),
                borderColor: role.color + '50',
                color: role.color,
              } : undefined}
            >
              {role.key}{isDefault ? ' ★' : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function Loader() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-5 h-5 border-2 border-white/5 border-t-white/20 rounded-full animate-spin" />
    </div>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  );
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
