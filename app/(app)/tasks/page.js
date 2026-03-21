'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTaskDrawer } from '@/hooks/useTaskDrawer';

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

const TASK_ROW_ESTIMATE = 66;
const VIRTUALIZATION_THRESHOLD = 40;

async function fetchQueue(type, queue) {
  const url = queue
    ? `/api/tracker/tasks?type=${type}&queue=${queue}`
    : `/api/tracker/tasks?type=${type}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(r.status === 503 ? 'Трекер не подключён' : `Ошибка ${r.status}`);
  return r.json();
}

function formatDeadline(deadline) {
  if (!deadline) return null;
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return deadline;
  return parsed.toLocaleDateString('ru-RU');
}

function TaskRow({ task, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-craft-surface/60 hover:bg-craft-surface transition-colors group cursor-pointer text-left"
    >
      <span className="text-xs text-craft-muted font-mono shrink-0">{task.key}</span>
      <span className="text-sm flex-1 truncate">{task.summary}</span>
      {task.status && (
        <span className={`text-2xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[task.statusKey] || 'bg-craft-surface2 text-craft-muted'}`}>
          {task.status}
        </span>
      )}
      {task.deadline && (
        <span className="text-2xs text-craft-muted shrink-0">{formatDeadline(task.deadline)}</span>
      )}
    </button>
  );
}

export default function TasksPage() {
  const { open: openDrawer } = useTaskDrawer();
  const [queue, setQueue] = useState('my');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null);
  const parentRef = useRef(null);

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

  const shouldVirtualize = tasks.length > VIRTUALIZATION_THRESHOLD;
  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? tasks.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => TASK_ROW_ESTIMATE,
    overscan: 8,
  });

  useEffect(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = 0;
    }
  }, [queue]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-semibold">Задачи</h1>
          <div className="text-2xs text-craft-muted">
            {shouldVirtualize ? 'Виртуализированный список для больших очередей' : 'Список задач с быстрым доступом к drawer'}
          </div>
        </div>
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
      ) : shouldVirtualize ? (
        <div
          ref={parentRef}
          className="overflow-y-auto pr-1 rounded-xl"
          style={{ maxHeight: 'calc(100vh - 18rem)' }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const task = tasks[virtualRow.index];
              if (!task) return null;
              return (
                <div
                  key={task.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="pb-1">
                    <TaskRow task={task} onClick={() => openDrawer(task.key)} />
                  </div>
                </div>
              );
            })}
          </div>
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
              >
                <TaskRow task={task} onClick={() => openDrawer(task.key)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
