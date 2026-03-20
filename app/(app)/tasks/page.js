'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const QUEUES = [
  { key: 'all', label: 'Все задачи' },
  { key: 'my', label: 'Мои задачи' },
  { key: 'ARCH', label: 'Архитектура' },
  { key: 'CRM', label: 'CRM' },
  { key: 'HR', label: 'Кадры' },
  { key: 'DOCS', label: 'Документы' },
];

const STATUS_COLORS = {
  open: 'bg-craft-accent/20 text-craft-accent',
  inProgress: 'bg-craft-orange/20 text-craft-orange',
  closed: 'bg-craft-green/20 text-craft-green',
  resolved: 'bg-craft-green/20 text-craft-green',
  needInfo: 'bg-craft-purple/20 text-craft-purple',
};

async function fetchQueue(type, queue) {
  const url = queue
    ? `/api/tracker/tasks?type=${type}&queue=${queue}`
    : `/api/tracker/tasks?type=${type}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(r.status === 503 ? 'Трекер не подключён' : `Ошибка ${r.status}`);
  return r.json();
}

export default function TasksPage() {
  const [queue, setQueue] = useState('my');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (queue === 'all') {
        const results = await Promise.all(
          ['ARCH', 'CRM', 'HR', 'DOCS'].map(q => fetchQueue('queue', q))
        );
        setTasks(results.flatMap(r => r.tasks || []));
        setSource(results[0]?.source || null);
      } else if (queue === 'my') {
        const data = await fetchQueue('my', null);
        setTasks(data.tasks || []);
        setSource(data.source || null);
      } else {
        const data = await fetchQueue('queue', queue);
        setTasks(data.tasks || []);
        setSource(data.source || null);
      }
    } catch (e) {
      setError(e.message);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [queue]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-display font-semibold">Задачи</h1>
        {source && (
          <span className="text-2xs px-2 py-0.5 rounded-full bg-craft-surface2 text-craft-muted">
            {source === 'local' ? 'Локальная БД' : 'Tracker API'}
          </span>
        )}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {QUEUES.map(q => (
          <button
            key={q.key}
            onClick={() => setQueue(q.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              queue === q.key
                ? 'bg-craft-accent/15 text-craft-accent'
                : 'text-craft-muted hover:text-white hover:bg-craft-surface2'
            }`}
          >
            {q.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-craft-surface animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <div className="text-craft-red/60 mb-2 text-sm">{error}</div>
          <button
            onClick={loadTasks}
            className="text-craft-accent/70 hover:text-craft-accent text-2xs"
          >
            Повторить
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 text-craft-muted text-sm">
          Нет задач в этой очереди
        </div>
      ) : (
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {tasks.map(task => (
              <motion.div
                key={task.key}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-craft-surface/60 hover:bg-craft-surface transition-colors group"
              >
                <span className="text-xs text-craft-muted font-mono shrink-0">{task.key}</span>
                <span className="text-sm flex-1 truncate">{task.summary}</span>
                {task.status && (
                  <span className={`text-2xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[task.statusKey] || 'bg-craft-surface2 text-craft-muted'}`}>
                    {task.status}
                  </span>
                )}
                {task.deadline && (
                  <span className="text-2xs text-craft-muted shrink-0">{task.deadline}</span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
