'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';

const STAGES = [
  { key: 'newLead', label: 'Новый лид', shortLabel: 'Лид', accent: '#5BA4F5' },
  { key: 'qualification', label: 'Квалификация', shortLabel: 'Квалиф.', accent: '#C9A0FF' },
  { key: 'proposal', label: 'КП отправлено', shortLabel: 'КП', accent: '#FFB155' },
  { key: 'negotiation', label: 'Переговоры', shortLabel: 'Перег.', accent: '#FF9F43' },
  { key: 'contract', label: 'Договор', shortLabel: 'Договор', accent: '#42C774' },
  { key: 'projectOpened', label: 'Проект открыт', shortLabel: 'Проект', accent: '#2ECC71' },
];

const STATUS_MAP = {
  'Новый лид': 'newLead',
  'Квалификация': 'qualification',
  'КП отправлено': 'proposal',
  'Переговоры': 'negotiation',
  'Договор': 'contract',
  'Проект открыт': 'projectOpened',
};

async function readTrackerJson(response) {
  let data = {};
  try {
    data = await response.json();
  } catch {
    /* non-JSON body */
  }

  if (!response.ok) {
    throw new Error(
      data.error || (response.status === 503 ? 'Трекер не подключён' : `Ошибка ${response.status}`)
    );
  }

  return data;
}

function resolveStage(task) {
  if (task?.statusKey && STAGES.some((stage) => stage.key === task.statusKey)) {
    return task.statusKey;
  }
  return STATUS_MAP[task?.status] || null;
}

function roundRate(value) {
  return Math.round(value * 10) / 10;
}

function buildMiniFunnel(tasks = []) {
  const counts = Object.fromEntries(STAGES.map((stage) => [stage.key, 0]));

  tasks.forEach((task) => {
    const stageKey = resolveStage(task);
    if (stageKey && counts[stageKey] != null) {
      counts[stageKey] += 1;
    }
  });

  const maxCount = Math.max(...Object.values(counts), 1);
  const stageRows = STAGES.map((stage, index) => {
    const count = counts[stage.key] || 0;
    const nextStage = STAGES[index + 1];
    const nextCount = nextStage ? counts[nextStage.key] || 0 : null;
    return {
      ...stage,
      count,
      barWidth: count > 0 ? Math.max(12, Math.round((count / maxCount) * 100)) : 0,
      conversionToNext:
        nextCount == null ? null : count > 0 ? roundRate((nextCount / count) * 100) : 0,
    };
  });

  const firstCount = stageRows[0]?.count || 0;
  const lastCount = stageRows[stageRows.length - 1]?.count || 0;

  return {
    total: tasks.length,
    stageRows,
    overall: {
      firstCount,
      lastCount,
      rate: firstCount > 0 ? roundRate((lastCount / firstCount) * 100) : 0,
    },
  };
}

function LoadingState() {
  return (
    <div className="rounded-xl border border-craft-border bg-craft-surface/75 px-4 py-3">
      <div className="mb-2 h-3 w-32 rounded-full bg-white/[0.06] animate-pulse" />
      <div className="flex gap-2 overflow-hidden">
        {STAGES.map((stage) => (
          <div key={stage.key} className="flex-1 min-w-[88px] rounded-lg bg-white/[0.04] px-2.5 py-2">
            <div className="h-3 w-12 rounded-full bg-white/[0.06] animate-pulse" />
            <div className="mt-2 h-1.5 rounded-full bg-white/[0.05]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MiniFunnel({ trackerConnected = false }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTasks = useCallback(async () => {
    if (!trackerConnected) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tracker/queues/CRM');
      const data = await readTrackerJson(response);
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (err) {
      setError(err.message);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [trackerConnected]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const funnel = useMemo(() => buildMiniFunnel(tasks), [tasks]);

  if (!trackerConnected) {
    return null;
  }

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-craft-border bg-craft-surface/75 px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-2xs text-craft-red/70">Не удалось загрузить mini-funnel</div>
          <div className="text-2xs text-white/20">{error}</div>
        </div>
        <button
          type="button"
          onClick={() => loadTasks()}
          className="text-2xs px-3 py-1.5 rounded-lg bg-white/[0.05] text-white/65 hover:bg-white/[0.08]"
        >
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-craft-border bg-craft-surface/75 px-4 py-3 overflow-hidden">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-2xs font-medium text-white/50">Mini Funnel</div>
          <div className="text-2xs text-white/20">
            {funnel.overall.firstCount} → {funnel.overall.lastCount} ({funnel.overall.rate}%)
          </div>
        </div>
        <div className="text-2xs text-white/25">{funnel.total} лидов в CRM</div>
      </div>

      <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
        {funnel.stageRows.map((stage, index) => (
          <Fragment key={stage.key}>
            <div className="min-w-[92px] flex-1 rounded-lg border border-white/[0.06] bg-craft-bg/35 px-2.5 py-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] leading-tight text-white/35">{stage.shortLabel}</span>
                <span className="text-sm font-display font-medium" style={{ color: stage.accent }}>
                  {stage.count}
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${stage.barWidth}%`,
                    background: `linear-gradient(90deg, ${stage.accent}, rgba(255,255,255,0.6))`,
                  }}
                />
              </div>
            </div>

            {funnel.stageRows[index + 1] && (
              <div className="shrink-0 self-center whitespace-nowrap text-2xs text-white/25">
                {stage.conversionToNext}% →
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
