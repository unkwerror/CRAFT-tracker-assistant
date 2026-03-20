'use client';

import { useState, useEffect, useCallback } from 'react';

const CRM_FORM_URL = 'https://forms.yandex.ru/'; // Заменить на реальную форму

export default function CrmKanban({ trackerConnected = false }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fields, setFields] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);

  const fetchTasks = useCallback(() => {
    if (!trackerConnected) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch('/api/tracker/tasks?queue=CRM')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTasks(data.tasks || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [trackerConnected]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetch('/api/queues/CRM/fields')
      .then((r) => r.json())
      .then((data) => setFields(data.fields || []))
      .catch(() => setFields([]));
  }, []);

  const columns = [
    { key: 'new', label: 'Новый лид', color: 'bg-craft-accent/10 border-craft-accent/30' },
    { key: 'qualification', label: 'Квалификация', color: 'bg-craft-orange/10 border-craft-orange/30' },
    { key: 'proposal', label: 'КП отправлено', color: 'bg-craft-purple/10 border-craft-purple/30' },
    { key: 'negotiation', label: 'Переговоры', color: 'bg-craft-cyan/10 border-craft-cyan/30' },
    { key: 'contract', label: 'Договор', color: 'bg-craft-green/10 border-craft-green/30' },
    { key: 'project', label: 'Проект открыт', color: 'bg-craft-green/20 border-craft-green/50' },
    { key: 'other', label: 'Другое', color: 'bg-white/5 border-white/10' },
  ];

  const groupByStatus = (tasks) => {
    const groups = {};
    columns.forEach((c) => (groups[c.key] = []));
    const statusToCol = (status, statusKey) => {
      const s = (status || '').toLowerCase();
      const sk = (statusKey || '').toLowerCase();
      if (s.includes('новый') || sk.includes('new')) return 'new';
      if (s.includes('квалификац') || sk.includes('qualif')) return 'qualification';
      if (s.includes('кп') || s.includes('отправлено') || sk.includes('proposal')) return 'proposal';
      if (s.includes('переговор') || sk.includes('negot')) return 'negotiation';
      if (s.includes('договор') && !s.includes('проект')) return 'contract';
      if (s.includes('проект открыт') || s.includes('открыт')) return 'project';
      return 'other';
    };
    tasks.forEach((t) => {
      const key = statusToCol(t.status, t.statusKey);
      groups[key].push(t);
    });
    return groups;
  };

  const groups = groupByStatus(tasks);

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
      <div className="bg-craft-surface border border-craft-border rounded-xl p-16 flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-white/5 border-t-craft-accent/60 rounded-full animate-spin" />
        <span className="text-2xs text-white/20">Загрузка лидов...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-craft-surface border border-craft-border rounded-xl p-10 text-center">
        <div className="text-craft-red/60 mb-2">Ошибка загрузки</div>
        <div className="text-2xs text-white/15 mb-3">{error}</div>
        <button
          onClick={fetchTasks}
          className="text-craft-accent/70 hover:text-craft-accent text-2xs"
        >
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-craft-border">
        <h2 className="text-[13px] font-display font-medium tracking-tight">CRM — Воронка лидов</h2>
        <div className="flex items-center gap-2">
          <span className="text-2xs text-white/25">{tasks.length} лидов</span>
          <a
            href={CRM_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-2xs px-3 py-1.5 rounded-lg bg-craft-accent/15 text-craft-accent hover:bg-craft-accent/25 transition-colors"
          >
            + Новый лид
          </a>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-3 p-4 min-w-max">
          {columns.map((col) => (
            <div
              key={col.key}
              className={`w-56 shrink-0 rounded-lg border ${col.color} p-2 min-h-[200px]`}
            >
              <div className="text-2xs font-medium text-white/40 mb-2 px-1">
                {col.label} ({groups[col.key]?.length || 0})
              </div>
              <div className="space-y-2">
                {(groups[col.key] || []).map((task) => (
                  <LeadCard
                    key={task.key}
                    task={task}
                    fields={fields}
                    isSelected={selectedTask?.key === task.key}
                    onClick={() => setSelectedTask(selectedTask?.key === task.key ? null : task)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedTask && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="bg-craft-surface border border-craft-border rounded-xl max-w-md w-full p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-mono text-white/60">{selectedTask.key}</h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-white/30 hover:text-white/60"
              >
                ×
              </button>
            </div>
            <div className="text-[15px] font-medium mb-3">{selectedTask.summary}</div>
            <div className="text-2xs text-white/40 mb-4">
              Статус: {selectedTask.status} • {selectedTask.assignee || 'Не назначен'}
            </div>
            <a
              href={selectedTask.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-craft-accent text-2xs hover:underline"
            >
              Открыть в Трекере →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function LeadCard({ task, fields, isSelected, onClick }) {
  const showFields = fields.filter((f) => f.show_on_card);
  const getFieldValue = (f) => {
    const val = task.customFields?.[f.field_key] ?? task.customFields?.[f.id];
    return val || '—';
  };

  return (
    <div
      onClick={onClick}
      className={`bg-craft-bg/80 rounded-lg p-3 border border-white/[0.06] cursor-pointer transition-all duration-200 hover:border-white/10 ${
        isSelected ? 'ring-1 ring-craft-accent/50 border-craft-accent/30' : ''
      }`}
    >
      <div className="text-2xs font-mono text-white/20 mb-1">{task.key}</div>
      <div className="text-[12px] text-white/70 mb-2 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{task.summary}</div>
      {showFields.slice(0, 2).map((f) => (
        <div key={f.field_key} className="text-2xs text-white/30">
          {f.label}: {getFieldValue(f)}
        </div>
      ))}
    </div>
  );
}
