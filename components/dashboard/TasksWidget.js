'use client';
import { useState, useEffect } from 'react';

const STATUS_COLORS = {
  open: { bg: 'bg-craft-accent/10', text: 'text-craft-accent', label: 'Открыта' },
  inProgress: { bg: 'bg-craft-orange/10', text: 'text-craft-orange', label: 'В работе' },
  needsInfo: { bg: 'bg-craft-purple/10', text: 'text-craft-purple', label: 'Нужна инфо' },
  review: { bg: 'bg-craft-cyan/10', text: 'text-craft-cyan', label: 'Проверка' },
  closed: { bg: 'bg-craft-green/10', text: 'text-craft-green', label: 'Закрыта' },
};

export default function TasksWidget({ title = 'Мои задачи', trackerConnected = false }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!trackerConnected) {
      setLoading(false);
      return;
    }
    fetch('/api/tracker/tasks')
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setTasks(data.tasks || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [trackerConnected]);

  const visibleTasks = expanded ? tasks : tasks.slice(0, 5);

  return (
    <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-craft-border">
        <h2 className="text-[13px] font-display font-medium tracking-tight">{title}</h2>
        {tasks.length > 0 && (
          <span className="text-2xs text-white/25">{tasks.length}</span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="px-5 py-8 flex justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <div className="px-5 py-8 text-center">
          <div className="text-[13px] text-craft-red/60 mb-1">Ошибка загрузки</div>
          <div className="text-2xs text-white/15">{error}</div>
        </div>
      ) : !trackerConnected ? (
        <div className="px-5 py-8 text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-white/[0.03] flex items-center justify-center">
            <svg className="w-5 h-5 text-white/10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="3" y="4" width="14" height="12" rx="2" />
              <path d="M7 9h6M7 12h4" />
            </svg>
          </div>
          <div className="text-[13px] text-white/25 mb-1">Трекер не подключён</div>
          <div className="text-2xs text-white/15">Добавьте TRACKER_ORG_ID в переменные окружения</div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <div className="text-[13px] text-craft-green/50">Нет активных задач</div>
        </div>
      ) : (
        <>
          <div className="divide-y divide-white/[0.04]">
            {visibleTasks.map((task, i) => {
              const status = STATUS_COLORS[task.status] || STATUS_COLORS.open;
              const isOverdue = task.deadline && new Date(task.deadline) < new Date();
              return (
                <div
                  key={task.key || i}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-all duration-200 group"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-2xs font-mono text-white/20">{task.key}</span>
                      {task.priority === 'critical' && (
                        <span className="text-2xs px-1.5 rounded bg-craft-red/10 text-craft-red">Крит.</span>
                      )}
                    </div>
                    <div className="text-[13px] text-white/60 truncate group-hover:text-white/80 transition-colors duration-200">
                      {task.summary}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    {task.deadline && (
                      <span className={`text-2xs ${isOverdue ? 'text-craft-red' : 'text-white/20'}`}>
                        {formatDate(task.deadline)}
                      </span>
                    )}
                    <span className={`text-2xs px-2 py-0.5 rounded ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {tasks.length > 5 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full py-2.5 text-2xs text-white/20 hover:text-white/40 border-t border-white/[0.04] transition-colors duration-200"
            >
              {expanded ? 'Свернуть' : `Показать все ${tasks.length}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div className="w-5 h-5 border-2 border-white/5 border-t-white/20 rounded-full animate-spin" />
  );
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, '0');
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${day} ${months[d.getMonth()]}`;
}
