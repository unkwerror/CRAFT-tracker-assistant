'use client';

import { useState, useEffect, useCallback } from 'react';

const STATUS_COLORS = {
  open: { bg: 'bg-craft-accent/10', text: 'text-craft-accent', label: 'Открыта' },
  inProgress: { bg: 'bg-craft-orange/10', text: 'text-craft-orange', label: 'В работе' },
  needsInfo: { bg: 'bg-craft-purple/10', text: 'text-craft-purple', label: 'Нужна инфо' },
  review: { bg: 'bg-craft-cyan/10', text: 'text-craft-cyan', label: 'Проверка' },
  closed: { bg: 'bg-craft-green/10', text: 'text-craft-green', label: 'Закрыта' },
};

export default function QueueTasks({
  title = 'Задачи',
  queueKey = null,
  trackerConnected = false,
  emptyMessage = 'Нет активных задач',
}) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const fetchTasks = useCallback(() => {
    if (!trackerConnected) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setWarning(null);
    const params = new URLSearchParams();
    if (queueKey) params.set('queue', queueKey);
    fetch(`/api/tracker/tasks?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTasks(data.tasks || []);
        if (data.warning) setWarning(data.warning);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [trackerConnected, queueKey]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const VISIBLE_COUNT = 5;
  const hasMore = tasks.length > VISIBLE_COUNT;
  const visibleTasks = expanded ? tasks : tasks.slice(0, VISIBLE_COUNT);

  return (
    <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden transition-all duration-300 hover:border-craft-border2 group">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-craft-border">
        <h2 className="text-[13px] font-display font-medium tracking-tight">{title}</h2>
        {tasks.length > 0 && (
          <span className="text-2xs text-white/25 tabular-nums">{tasks.length}</span>
        )}
      </div>

      {loading ? (
        <div className="px-5 py-12 flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-white/5 border-t-craft-accent/60 rounded-full animate-spin" />
          <span className="text-2xs text-white/20">Загрузка...</span>
        </div>
      ) : error ? (
        <div className="px-5 py-10 text-center">
          <div className="text-[13px] text-craft-red/60 mb-1">Ошибка загрузки</div>
          <div className="text-2xs text-white/15 mb-3">{error}</div>
          <button
            onClick={fetchTasks}
            className="text-2xs text-craft-accent/70 hover:text-craft-accent transition-colors"
          >
            Повторить
          </button>
        </div>
      ) : !trackerConnected ? (
        <EmptyState
          icon="tasks"
          title="Трекер не подключён"
          sub="Добавьте TRACKER_ORG_ID в переменные окружения"
        />
      ) : warning ? (
        <div className="px-5 py-8 text-center">
          <div className="text-[13px] text-craft-orange/50 mb-1">{warning}</div>
          <div className="text-2xs text-white/15">Настройте очередь в Яндекс Трекере</div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div className="text-[13px] text-craft-green/50">{emptyMessage}</div>
        </div>
      ) : (
        <>
          <div className="divide-y divide-white/[0.03]">
            {visibleTasks.map((task, i) => (
              <TaskRow key={task.key || i} task={task} index={i} />
            ))}
          </div>
          {hasMore && (
            <>
              <div className={`expand-section ${expanded ? 'open' : ''}`}>
                <div>
                  <div className="divide-y divide-white/[0.03]">
                    {tasks.slice(VISIBLE_COUNT).map((task, i) => (
                      <TaskRow
                        key={task.key || VISIBLE_COUNT + i}
                        task={task}
                        index={VISIBLE_COUNT + i}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="w-full py-2.5 text-2xs text-white/20 hover:text-white/40 border-t border-white/[0.04] transition-all duration-200 hover:bg-white/[0.02]"
              >
                {expanded ? 'Свернуть' : `Ещё ${tasks.length - VISIBLE_COUNT} задач`}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

function TaskRow({ task, index }) {
  const statusKey = task.statusKey || task.status || 'open';
  const status = STATUS_COLORS[statusKey] || STATUS_COLORS.open;
  const isOverdue = task.deadline && new Date(task.deadline) < new Date();

  return (
    <a
      href={task.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/[0.02] transition-all duration-200 group block"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-2xs font-mono text-white/20">{task.key}</span>
          {task.priority === 'critical' && (
            <span className="text-2xs px-1.5 rounded bg-craft-red/10 text-craft-red">Крит.</span>
          )}
        </div>
        <div className="text-[13px] text-white/55 truncate group-hover:text-white/80 transition-colors duration-200">
          {task.summary}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {task.deadline && (
          <span
            className={`text-2xs transition-colors duration-200 ${
              isOverdue ? 'text-craft-red' : 'text-white/20'
            }`}
          >
            {fmtDate(task.deadline)}
          </span>
        )}
        <span
          className={`text-2xs px-2 py-0.5 rounded transition-all duration-200 ${status.bg} ${status.text}`}
        >
          {task.status || status.label}
        </span>
      </div>
    </a>
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <div className="px-5 py-10 text-center">
      <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-white/[0.03] flex items-center justify-center">
        <svg
          className="w-5 h-5 text-white/10"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <rect x="3" y="4" width="14" height="12" rx="2" />
          <path d="M7 9h6M7 12h4" />
        </svg>
      </div>
      <div className="text-[13px] text-white/25 mb-1">{title}</div>
      {sub && <div className="text-2xs text-white/15">{sub}</div>}
    </div>
  );
}

function fmtDate(d) {
  const dt = new Date(d);
  const months = [
    'янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
  ];
  return `${dt.getDate().toString().padStart(2, '0')} ${months[dt.getMonth()]}`;
}
