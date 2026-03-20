'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const COLUMNS = [
  { key: 'newLead',       label: 'Новый лид',     color: '#5BA4F5', bg: 'bg-craft-accent/10  border-craft-accent/30' },
  { key: 'qualification', label: 'Квалификация',   color: '#C9A0FF', bg: 'bg-craft-purple/10 border-craft-purple/30' },
  { key: 'proposal',      label: 'КП отправлено',  color: '#FFB155', bg: 'bg-craft-orange/10 border-craft-orange/30' },
  { key: 'negotiation',   label: 'Переговоры',     color: '#FF9F43', bg: 'bg-craft-orange/10 border-craft-orange/30' },
  { key: 'contract',      label: 'Договор',        color: '#42C774', bg: 'bg-craft-green/10  border-craft-green/30' },
  { key: 'projectOpened', label: 'Проект открыт',  color: '#2ECC71', bg: 'bg-craft-green/20  border-craft-green/50' },
];

const STATUS_MAP = {
  'Новый лид': 'newLead', 'Квалификация': 'qualification',
  'КП отправлено': 'proposal', 'Переговоры': 'negotiation',
  'Договор': 'contract', 'Проект открыт': 'projectOpened',
  'Отложен': 'postponed', 'Отказ': 'rejected',
};

const POLL_INTERVAL = 30_000;

function resolveColumn(task) {
  if (task.statusKey && COLUMNS.find(c => c.key === task.statusKey)) return task.statusKey;
  const mapped = STATUS_MAP[task.status];
  if (mapped && COLUMNS.find(c => c.key === mapped)) return mapped;
  return null;
}

export default function CrmKanban({ trackerConnected = false }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [toast, setToast] = useState(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [dragState, setDragState] = useState({ taskKey: null, overCol: null, allowed: null });
  const transitionCache = useRef({});
  const pollRef = useRef(null);

  const showToast = useCallback((msg, type = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchTasks = useCallback((silent = false) => {
    if (!trackerConnected) { setLoading(false); return; }
    if (!silent) { setLoading(true); setError(null); }
    fetch('/api/tracker/queues/CRM')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setTasks(data.tasks || []);
      })
      .catch(err => { if (!silent) setError(err.message); })
      .finally(() => setLoading(false));
  }, [trackerConnected]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    if (!trackerConnected) return;
    pollRef.current = setInterval(() => fetchTasks(true), POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [trackerConnected, fetchTasks]);

  const getTransitions = useCallback(async (issueKey) => {
    if (transitionCache.current[issueKey]) return transitionCache.current[issueKey];
    try {
      const r = await fetch(`/api/tracker/issues/${issueKey}/transitions`);
      const data = await r.json();
      const t = data.transitions || [];
      transitionCache.current[issueKey] = t;
      return t;
    } catch { return []; }
  }, []);

  const executeTransition = useCallback(async (issueKey, transitionId) => {
    const r = await fetch(`/api/tracker/issues/${issueKey}/transitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transitionId }),
    });
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    return data;
  }, []);

  // ─── Drag & Drop ───

  const onDragStart = useCallback((e, task) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.key);
    setDragState(s => ({ ...s, taskKey: task.key }));
    getTransitions(task.key);
  }, [getTransitions]);

  const onDragOver = useCallback((e, colKey) => {
    e.preventDefault();
    const taskKey = dragState.taskKey;
    if (!taskKey) return;
    const cached = transitionCache.current[taskKey] || [];
    const canDrop = cached.some(t => t.to === colKey);
    setDragState(s => ({ ...s, overCol: colKey, allowed: canDrop }));
    e.dataTransfer.dropEffect = canDrop ? 'move' : 'none';
  }, [dragState.taskKey]);

  const onDrop = useCallback(async (e, targetCol) => {
    e.preventDefault();
    const taskKey = dragState.taskKey;
    setDragState({ taskKey: null, overCol: null, allowed: null });
    if (!taskKey) return;

    const task = tasks.find(t => t.key === taskKey);
    if (!task) return;
    const currentCol = resolveColumn(task);
    if (currentCol === targetCol) return;

    const transitions = await getTransitions(taskKey);
    const transition = transitions.find(t => t.to === targetCol);
    if (!transition) {
      showToast(`Переход в "${COLUMNS.find(c => c.key === targetCol)?.label}" невозможен`);
      return;
    }

    const prevStatus = task.status;
    const prevStatusKey = task.statusKey;
    setTasks(prev => prev.map(t =>
      t.key === taskKey ? { ...t, statusKey: targetCol, status: COLUMNS.find(c => c.key === targetCol)?.label || targetCol } : t
    ));
    delete transitionCache.current[taskKey];

    try {
      await executeTransition(taskKey, transition.id);
      showToast(`${taskKey} → ${COLUMNS.find(c => c.key === targetCol)?.label}`, 'success');
    } catch (err) {
      setTasks(prev => prev.map(t =>
        t.key === taskKey ? { ...t, status: prevStatus, statusKey: prevStatusKey } : t
      ));
      showToast(`Ошибка: ${err.message}`);
    }
  }, [dragState.taskKey, tasks, getTransitions, executeTransition, showToast]);

  const onDragEnd = useCallback(() => {
    setDragState({ taskKey: null, overCol: null, allowed: null });
  }, []);

  // ─── Group tasks ───

  const groups = {};
  COLUMNS.forEach(c => (groups[c.key] = []));
  const otherTasks = [];
  tasks.forEach(t => {
    const col = resolveColumn(t);
    if (col && groups[col]) groups[col].push(t);
    else otherTasks.push(t);
  });

  if (!trackerConnected) {
    return (
      <div className="bg-craft-surface border border-craft-border rounded-xl p-10 text-center">
        <div className="text-white/25 mb-2">Трекер не подключён</div>
        <div className="text-2xs text-white/15">TRACKER_ORG_ID не задан</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-craft-surface border border-craft-border rounded-xl p-4">
        <div className="space-y-3">
          {[1, 2].map(r => (
            <div key={r} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <motion.div
                  key={`${r}-${i}`}
                  className="rounded-lg border border-white/[0.06] bg-craft-bg/60 h-36"
                  animate={{ opacity: [0.35, 0.7, 0.35] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: i * 0.06 }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-craft-surface border border-craft-border rounded-xl p-10 text-center">
        <div className="text-craft-red/60 mb-2">Ошибка загрузки</div>
        <div className="text-2xs text-white/15 mb-3">{error}</div>
        <button onClick={() => fetchTasks()} className="text-craft-accent/70 hover:text-craft-accent text-2xs">Повторить</button>
      </div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
      className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden relative"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={`${toast.type}-${toast.msg}`}
            initial={{ opacity: 0, x: 20, y: -8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 12, y: -8 }}
            transition={{ duration: 0.22 }}
            className={`absolute top-3 right-3 z-50 text-2xs px-3 py-2 rounded-lg shadow-lg border ${
              toast.type === 'success'
                ? 'bg-craft-green/20 text-craft-green border-craft-green/30'
                : 'bg-craft-red/20 text-craft-red border-craft-red/30'
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between px-5 py-3.5 border-b border-craft-border">
        <h2 className="text-[13px] font-display font-medium tracking-tight">CRM — Воронка лидов</h2>
        <div className="flex items-center gap-2">
          <span className="text-2xs text-white/25">{tasks.length} лидов</span>
          <motion.button
            onClick={() => setShowNewLead(v => !v)}
            whileTap={{ scale: 0.97 }}
            className="text-2xs px-3 py-1.5 rounded-lg bg-craft-accent/15 text-craft-accent hover:bg-craft-accent/25 transition-colors"
          >
            {showNewLead ? 'Отмена' : '+ Новый лид'}
          </motion.button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showNewLead && (
          <motion.div
            key="new-lead-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24 }}
            className="overflow-hidden"
          >
            <NewLeadForm
              onCreated={(issue) => { setShowNewLead(false); fetchTasks(); showToast(`Создан ${issue.key}`, 'success'); }}
              onCancel={() => setShowNewLead(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto">
        <div className="flex gap-3 p-4 min-w-max">
          {COLUMNS.map(col => {
            const isOver = dragState.overCol === col.key && dragState.taskKey;
            const canDrop = dragState.allowed;
            let borderClass = '';
            if (isOver) borderClass = canDrop ? 'ring-2 ring-craft-green/50 border-craft-green/40' : 'ring-2 ring-craft-red/50 border-craft-red/40';
            return (
              <motion.div
                key={col.key}
                layout
                onDragOver={e => onDragOver(e, col.key)}
                onDragLeave={() => setDragState(s => ({ ...s, overCol: null, allowed: null }))}
                onDrop={e => onDrop(e, col.key)}
                animate={isOver ? { scale: 1.01 } : { scale: 1 }}
                className={`w-56 shrink-0 rounded-lg border ${col.bg} p-2 min-h-[200px] transition-all duration-200 ${borderClass}`}
              >
                <div className="flex items-center gap-1.5 mb-2 px-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="text-2xs font-medium text-white/40">{col.label} ({groups[col.key]?.length || 0})</span>
                </div>
                <div className="space-y-2">
                  {(groups[col.key] || []).map(task => (
                    <LeadCard
                      key={task.key} task={task}
                      isDragging={dragState.taskKey === task.key}
                      onClick={() => setSelectedTask(task)}
                      onDragStart={e => onDragStart(e, task)}
                      onDragEnd={onDragEnd}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}
          {otherTasks.length > 0 && (
            <div className="w-56 shrink-0 rounded-lg border bg-white/5 border-white/10 p-2 min-h-[200px]">
              <div className="text-2xs font-medium text-white/40 mb-2 px-1">Другое ({otherTasks.length})</div>
              <div className="space-y-2">
                {otherTasks.map(task => <LeadCard key={task.key} task={task} onClick={() => setSelectedTask(task)} />)}
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedTask && (
          <LeadDetailModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onTransition={async (transitionId, toLabel) => {
              try {
                await executeTransition(selectedTask.key, transitionId);
                delete transitionCache.current[selectedTask.key];
                setSelectedTask(null);
                fetchTasks();
                showToast(`${selectedTask.key} → ${toLabel}`, 'success');
              } catch (err) { showToast(`Ошибка: ${err.message}`); }
            }}
            onUpdated={() => { fetchTasks(); }}
            getTransitions={getTransitions}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function LeadCard({ task, isDragging, onClick, onDragStart, onDragEnd }) {
  return (
    <motion.div
      layout
      layoutId={`lead-${task.key}`}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      className={`bg-craft-bg/80 rounded-lg p-3 border border-white/[0.06] cursor-pointer transition-all duration-200 hover:border-white/10 select-none ${
        isDragging ? 'opacity-40 scale-95' : ''
      } ${onDragStart ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div className="text-2xs font-mono text-white/20 mb-1">{task.key}</div>
      <div className="text-[12px] text-white/70 mb-1.5 line-clamp-2">{task.summary}</div>
      <div className="flex items-center justify-between text-2xs text-white/25">
        <span>{task.assignee || 'Не назначен'}</span>
        {task.priority && <span className="text-white/15">{task.priority}</span>}
      </div>
    </motion.div>
  );
}

function LeadDetailModal({ task, onClose, onTransition, onUpdated, getTransitions }) {
  const [transitions, setTransitions] = useState([]);
  const [loadingT, setLoadingT] = useState(true);
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoadingT(true);
    getTransitions(task.key).then(t => { setTransitions(t); setLoadingT(false); });
  }, [task.key, getTransitions]);

  useEffect(() => {
    fetch(`/api/tracker/issues/${task.key}`)
      .then(r => r.json())
      .then(d => {
        const issue = d.issue || null;
        setDetail(issue);
        if (issue) {
          setEditFields({ summary: issue.summary || '', description: issue.description || '' });
        }
      })
      .catch(() => {});
  }, [task.key]);

  const displayTask = detail || task;

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {};
      if (editFields.summary !== displayTask.summary) body.summary = editFields.summary;
      if (editFields.description !== (displayTask.description || '')) body.description = editFields.description;
      if (Object.keys(body).length === 0) { setEditing(false); setSaving(false); return; }

      const r = await fetch(`/api/tracker/issues/${task.key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      setDetail(data.issue);
      setEditing(false);
      onUpdated?.();
    } catch (e) {
      alert(`Ошибка сохранения: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        layoutId={`lead-${task.key}`}
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="glass-modal border border-craft-border rounded-xl max-w-lg w-full p-5 shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-mono text-white/60 text-sm">{displayTask.key}</h3>
            <div className="text-2xs text-white/20 mt-0.5">{displayTask.type || 'Задача'} • {displayTask.priority || '—'}</div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setEditing(v => !v)}
              whileTap={{ scale: 0.97 }}
              className={`text-2xs px-2 py-1 rounded-md transition-colors ${editing ? 'bg-craft-accent/20 text-craft-accent' : 'text-white/25 hover:text-white/50'}`}
            >
              {editing ? 'Отмена' : 'Редактировать'}
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="text-white/30 hover:text-white/60 text-xl leading-none">&times;</motion.button>
          </div>
        </div>

        {editing ? (
          <div className="space-y-3 mb-4">
            <input
              type="text"
              value={editFields.summary}
              onChange={e => setEditFields(f => ({ ...f, summary: e.target.value }))}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-craft-accent/40"
            />
            <textarea
              value={editFields.description}
              onChange={e => setEditFields(f => ({ ...f, description: e.target.value }))}
              rows={4}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-2xs text-white/60 focus:outline-none focus:border-craft-accent/40 resize-none"
              placeholder="Описание..."
            />
            <motion.button
              onClick={handleSave}
              disabled={saving}
              whileTap={{ scale: 0.97 }}
              className="text-2xs px-3 py-1.5 rounded-lg bg-craft-accent/20 text-craft-accent hover:bg-craft-accent/30 transition-colors disabled:opacity-40"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </motion.button>
          </div>
        ) : (
          <>
            <div className="text-[15px] font-medium mb-3">{displayTask.summary}</div>
            {displayTask.description && (
              <div className="text-2xs text-white/40 mb-4 whitespace-pre-wrap border-l-2 border-white/10 pl-3">{displayTask.description}</div>
            )}
          </>
        )}

        <div className="grid grid-cols-2 gap-2 mb-4 text-2xs">
          <div className="bg-white/[0.03] rounded-lg p-2">
            <span className="text-white/25">Статус</span>
            <div className="text-white/70 mt-0.5">{displayTask.status}</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2">
            <span className="text-white/25">Исполнитель</span>
            <div className="text-white/70 mt-0.5">{displayTask.assignee || 'Не назначен'}</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2">
            <span className="text-white/25">Создан</span>
            <div className="text-white/70 mt-0.5">{displayTask.createdAt ? new Date(displayTask.createdAt).toLocaleDateString('ru-RU') : '—'}</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2">
            <span className="text-white/25">Обновлён</span>
            <div className="text-white/70 mt-0.5">{displayTask.updatedAt ? new Date(displayTask.updatedAt).toLocaleDateString('ru-RU') : '—'}</div>
          </div>
        </div>

        {displayTask.customFields && Object.keys(displayTask.customFields).length > 0 && (
          <div className="mb-4">
            <div className="text-2xs text-white/25 mb-2">Доп. поля</div>
            <div className="space-y-1">
              {Object.entries(displayTask.customFields).map(([k, v]) => (
                <div key={k} className="flex justify-between text-2xs">
                  <span className="text-white/30">{k}</span>
                  <span className="text-white/60">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-craft-border pt-3 mt-3">
          <div className="text-2xs text-white/25 mb-2">Сменить статус</div>
          {loadingT ? (
            <div className="flex items-center gap-2 text-2xs text-white/15">
              <div className="w-3 h-3 border border-white/10 border-t-white/30 rounded-full animate-spin" />
              Загрузка переходов...
            </div>
          ) : transitions.length === 0 ? (
            <div className="text-2xs text-white/15">Нет доступных переходов</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {transitions.map(t => (
                <motion.button
                  key={t.id}
                  onClick={() => onTransition(t.id, t.toDisplay || t.display)}
                  whileTap={{ scale: 0.97 }}
                  className="text-2xs px-2.5 py-1.5 rounded-lg bg-white/[0.06] text-white/60 hover:bg-white/10 hover:text-white/80 transition-colors border border-white/[0.06]"
                >
                  → {t.toDisplay || t.display}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-craft-border">
          <a href={displayTask.url || `https://tracker.yandex.ru/${displayTask.key}`} target="_blank" rel="noopener noreferrer"
            className="text-craft-accent text-2xs hover:underline">Открыть в Трекере →</a>
        </div>
      </motion.div>
    </motion.div>
  );
}

function NewLeadForm({ onCreated, onCancel }) {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!summary.trim()) return;
    setSubmitting(true);
    setErr(null);
    try {
      const r = await fetch('/api/tracker/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue: 'CRM', summary: summary.trim(), description: description.trim() || undefined }),
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      onCreated(data.issue);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-5 py-4 border-b border-craft-border bg-craft-bg/30">
      <div className="flex gap-3">
        <div className="flex-1 space-y-2">
          <input type="text" value={summary} onChange={e => setSummary(e.target.value)} placeholder="Название лида..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-craft-accent/40" autoFocus />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Описание (необязательно)" rows={2}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-2xs text-white/60 placeholder:text-white/15 focus:outline-none focus:border-craft-accent/40 resize-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <motion.button type="submit" disabled={submitting || !summary.trim()}
            whileTap={{ scale: 0.97 }}
            className="text-2xs px-3 py-2 rounded-lg bg-craft-accent/20 text-craft-accent hover:bg-craft-accent/30 transition-colors disabled:opacity-30">
            {submitting ? '...' : 'Создать'}
          </motion.button>
          <motion.button type="button" onClick={onCancel} whileTap={{ scale: 0.97 }} className="text-2xs px-3 py-2 rounded-lg text-white/30 hover:text-white/50 transition-colors">Отмена</motion.button>
        </div>
      </div>
      {err && <div className="text-2xs text-craft-red/70 mt-2">{err}</div>}
    </form>
  );
}
