'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion';

const CRM_STAGES = [
  { key: 'newLead', label: 'Новый лид' },
  { key: 'qualification', label: 'Квалификация' },
  { key: 'proposal', label: 'КП отправлено' },
  { key: 'negotiation', label: 'Переговоры' },
  { key: 'contract', label: 'Договор' },
  { key: 'projectOpened', label: 'Проект открыт' },
];

const INDUSTRY_BENCHMARK_DAYS = 45;
const CONVERSION_PERIOD_DAYS = 30;

async function readTrackerJson(r) {
  let data = {};
  try {
    data = await r.json();
  } catch {
    /* non-JSON */
  }
  if (!r.ok) {
    throw new Error(
      data.error || (r.status === 503 ? 'Трекер не подключён' : `Ошибка ${r.status}`)
    );
  }
  return data;
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isWonLead(task) {
  return task?.statusKey === 'contract' || task?.statusKey === 'projectOpened';
}

function buildConversionTrend(tasks) {
  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - CONVERSION_PERIOD_DAYS);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - CONVERSION_PERIOD_DAYS);

  const currentPeriod = tasks.filter((task) => {
    const stamp = parseDate(task.createdAt || task.updatedAt);
    return stamp && stamp >= currentStart && stamp <= now;
  });
  const previousPeriod = tasks.filter((task) => {
    const stamp = parseDate(task.createdAt || task.updatedAt);
    return stamp && stamp >= previousStart && stamp < currentStart;
  });

  const currentWon = currentPeriod.filter(isWonLead).length;
  const previousWon = previousPeriod.filter(isWonLead).length;
  const currentRate = currentPeriod.length > 0 ? Math.round((currentWon / currentPeriod.length) * 100) : null;
  const previousRate = previousPeriod.length > 0 ? Math.round((previousWon / previousPeriod.length) * 100) : null;

  return {
    currentRate,
    previousRate,
    delta:
      currentRate != null && previousRate != null
        ? currentRate - previousRate
        : null,
    currentWon,
    previousWon,
    currentTotal: currentPeriod.length,
    previousTotal: previousPeriod.length,
  };
}

function sortByDeadline(tasks) {
  return [...tasks]
    .filter((task) => parseDate(task.deadline))
    .sort((left, right) => parseDate(left.deadline) - parseDate(right.deadline));
}

function formatDate(value) {
  const parsed = parseDate(value);
  if (!parsed) return '—';
  return parsed.toLocaleDateString('ru-RU');
}

function daysUntil(value) {
  const parsed = parseDate(value);
  if (!parsed) return null;
  return Math.ceil((parsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function StatsBar({ trackerConnected = false }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);

  const loadStats = useCallback(() => {
    if (!trackerConnected) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      fetch('/api/tracker/tasks').then(readTrackerJson),
      fetch('/api/tracker/tasks?type=overdue').then(readTrackerJson),
      fetch('/api/tracker/queues/CRM').then(readTrackerJson),
    ])
      .then(([myTasks, overdue, crm]) => {
        const allMyTasks = myTasks.tasks || [];
        const inProgress = allMyTasks.filter(t => t.statusKey === 'inProgress').length;
        const total = allMyTasks.length;
        const overdueTasks = overdue.tasks || [];
        const overdueCount = overdueTasks.length;
        const crmTasks = crm.tasks || [];
        const crmCount = crmTasks.length;

        const crmByStatus = {};
        for (const t of crmTasks) {
          const sk = t.statusKey || 'unknown';
          crmByStatus[sk] = (crmByStatus[sk] || 0) + 1;
        }

        const avgCycleDays = calcAvgCycle(crmTasks);
        const wonCount = (crmByStatus.contract || 0) + (crmByStatus.projectOpened || 0);
        const convRate = crmCount > 0 ? Math.round((wonCount / crmCount) * 100) : null;

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recentLeads = crmTasks.filter(t => t.createdAt && new Date(t.createdAt) >= weekAgo).length;
        const prevLeads = crmTasks.filter(t => {
          if (!t.createdAt) return false;
          const d = new Date(t.createdAt);
          const twoWeeksAgo = new Date();
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
          return d >= twoWeeksAgo && d < weekAgo;
        }).length;

        const leadsTrend = prevLeads > 0 ? Math.round(((recentLeads - prevLeads) / prevLeads) * 100) : null;
        const conversionTrend = buildConversionTrend(crmTasks);
        const stageRows = CRM_STAGES.map((stage) => ({
          ...stage,
          count: crmByStatus[stage.key] || 0,
        }));

        setStats({
          total,
          inProgress,
          overdueCount,
          crmCount,
          crmByStatus,
          convRate,
          avgCycleDays,
          leadsTrend,
          recentLeads,
          myTasks: allMyTasks,
          overdueTasks,
          crmTasks,
          stageRows,
          conversionTrend,
          industryBenchmarkDays: INDUSTRY_BENCHMARK_DAYS,
        });
      })
      .catch((err) => {
        setError(err.message);
        setStats(null);
      })
      .finally(() => setLoading(false));
  }, [trackerConnected]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (!trackerConnected) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="bg-craft-surface/80 border border-craft-border rounded-2xl p-4 h-24 flex items-center justify-center">
            <span className="text-[11px] text-white/10">—</span>
          </div>
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[1,2,3,4,5].map(i => (
          <motion.div
            key={i}
            className="bg-craft-surface border border-craft-border rounded-2xl p-4 h-24"
            animate={{ opacity: [0.4, 0.75, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.06 }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="col-span-2 lg:col-span-5 bg-craft-surface border border-craft-border rounded-2xl p-8 text-center">
          <div className="text-craft-red/60 mb-2">Ошибка загрузки</div>
          <div className="text-2xs text-white/15 mb-3">{error}</div>
          <button
            type="button"
            onClick={() => loadStats()}
            className="text-craft-accent/70 hover:text-craft-accent text-2xs"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  const cards = [
    {
      id: 'tasks',
      label: 'Мои задачи',
      value: stats?.total || 0,
      sub: `${stats?.inProgress || 0} в работе`,
      color: '#5BA4F5',
      trend: null,
      icon: <IconTasks />,
    },
    {
      id: 'overdue',
      label: 'Просроченные',
      value: stats?.overdueCount || 0,
      sub: stats?.overdueCount === 0 ? 'Всё в порядке' : 'Требуют внимания',
      color: stats?.overdueCount > 0 ? '#FF7B72' : '#42C774',
      trend: null,
      icon: <IconClock />,
    },
    {
      id: 'crm',
      label: 'CRM лиды',
      value: stats?.crmCount || 0,
      sub: `${stats?.recentLeads || 0} за неделю`,
      color: '#6DD8E0',
      trend: stats?.leadsTrend,
      icon: <IconFunnel />,
    },
    {
      id: 'conversion',
      label: 'Конверсия',
      value: stats?.convRate != null ? `${stats.convRate}%` : '—',
      sub: 'В договор / проект',
      color: '#42C774',
      trend: stats?.conversionTrend?.delta ?? null,
      icon: <IconChart />,
    },
    {
      id: 'cycle',
      label: 'Цикл сделки',
      value: stats?.avgCycleDays != null ? `${stats.avgCycleDays}д` : '—',
      sub: 'Среднее время',
      color: '#C9A0FF',
      trend: null,
      icon: <IconCalendar />,
    },
  ];
  const numericValues = cards.map((c) => {
    if (typeof c.value === 'number') return c.value;
    const parsed = parseInt(String(c.value), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });
  const maxValue = Math.max(...numericValues, 1);

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      className="grid grid-cols-2 lg:grid-cols-5 gap-3"
    >
      {cards.map((card, i) => (
        <MorphMetricCard
          key={card.label}
          card={card}
          expanded={expandedCard === card.id}
          onClick={() => setExpandedCard((prev) => (prev === card.id ? null : card.id))}
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
          }}
          pressure={Math.min(1, numericValues[i] / maxValue)}
          maskId={`metric-mask-${i}`}
        />
      ))}

      <AnimatePresence initial={false} mode="wait">
        {expandedCard && (
          <motion.div
            key={expandedCard}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="col-span-2 lg:col-span-5 rounded-2xl border border-craft-border bg-craft-surface/90 p-4"
          >
            <StatsAccordionDetails cardId={expandedCard} stats={stats} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MorphMetricCard({ card, variants, pressure, maskId, expanded, onClick }) {
  const intensity = 0.22 + pressure * 0.78;
  const border = 16 - pressure * 6;
  return (
    <motion.button
      type="button"
      variants={variants}
      whileHover={{
        y: -4,
        borderColor: 'rgba(91,164,245,0.3)',
        boxShadow: '0 10px 28px rgba(0,0,0,0.35), 0 0 0 1px rgba(91,164,245,0.2)',
      }}
      animate={{
        borderRadius: border,
        scale: 1 + pressure * 0.012,
      }}
      onClick={onClick}
      aria-expanded={expanded}
      className={`group relative border p-4 cursor-pointer overflow-hidden text-left ${
        expanded
          ? 'bg-craft-surface border-craft-accent/35 shadow-[0_0_0_1px_rgba(91,164,245,0.12)]'
          : 'bg-craft-surface/90 border-craft-border'
      }`}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="100" height="100" fill="black" />
            <motion.circle
              cx={30 + pressure * 45}
              cy={18 + pressure * 32}
              r={16 + pressure * 18}
              fill="white"
              animate={{
                cx: [30 + pressure * 45, 36 + pressure * 42, 30 + pressure * 45],
                cy: [18 + pressure * 32, 22 + pressure * 28, 18 + pressure * 32],
                r: [16 + pressure * 18, 19 + pressure * 20, 16 + pressure * 18],
              }}
              transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.rect
              x={58 - pressure * 22}
              y={54 - pressure * 20}
              width={24 + pressure * 30}
              height={24 + pressure * 22}
              rx={6 + pressure * 8}
              fill="white"
              animate={{
                x: [58 - pressure * 22, 54 - pressure * 18, 58 - pressure * 22],
                y: [54 - pressure * 20, 58 - pressure * 16, 54 - pressure * 20],
                rx: [6 + pressure * 8, 10 + pressure * 6, 6 + pressure * 8],
              }}
              transition={{ duration: 6.1, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }}
            />
          </mask>
          <linearGradient id={`${maskId}-g`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={card.color} stopOpacity={0.09 + intensity * 0.16} />
            <stop offset="100%" stopColor={card.color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill={`url(#${maskId}-g)`} mask={`url(#${maskId})`} />
      </svg>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <span className="text-[11px] text-white/30 font-medium">{card.label}</span>
          <div className="p-1.5 rounded-lg transition-colors duration-200" style={{ color: card.color + '60' }}>
            {card.icon}
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div className="text-2xl font-display font-light tracking-tight" style={{ color: card.color }}>
            <AnimatedValue value={card.value} />
          </div>
          {card.trend != null && card.trend !== 0 && (
            <span className={`text-2xs font-medium mb-1 ${card.trend > 0 ? 'text-craft-green' : 'text-craft-red'}`}>
              {card.trend > 0 ? '↑' : '↓'}{Math.abs(card.trend)}%
            </span>
          )}
        </div>
        <div className="text-[11px] text-white/20 mt-0.5">{card.sub}</div>
        <div className="mt-3 text-2xs text-white/25">{expanded ? 'Свернуть детали' : 'Показать детали'}</div>
      </div>
    </motion.button>
  );
}

function StatsAccordionDetails({ cardId, stats }) {
  if (cardId === 'tasks') {
    const nearestDeadlines = sortByDeadline(stats.myTasks)
      .filter((task) => {
        const delta = daysUntil(task.deadline);
        return delta != null && delta >= 0;
      })
      .slice(0, 5);

    return (
      <div className="space-y-3">
        <div>
          <div className="text-sm font-medium text-white/80">Ближайшие дедлайны</div>
          <div className="text-2xs text-white/25">Пять ближайших задач из персональной очереди</div>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {nearestDeadlines.length > 0 ? nearestDeadlines.map((task) => (
            <DetailRow
              key={task.key}
              title={task.summary}
              subtitle={task.key}
              meta={`${formatDate(task.deadline)} • ${daysUntil(task.deadline)} дн.`}
            />
          )) : (
            <EmptyDetail text="Нет задач с будущим дедлайном" />
          )}
        </div>
      </div>
    );
  }

  if (cardId === 'overdue') {
    const overdueItems = sortByDeadline(stats.overdueTasks).slice(0, 5);

    return (
      <div className="space-y-3">
        <div>
          <div className="text-sm font-medium text-white/80">Просроченные задачи</div>
          <div className="text-2xs text-white/25">Топ-5 задач с самым ранним дедлайном</div>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {overdueItems.length > 0 ? overdueItems.map((task) => {
            const overdueDays = Math.abs(Math.min(daysUntil(task.deadline) || 0, 0));
            return (
              <DetailRow
                key={task.key}
                title={task.summary}
                subtitle={task.key}
                meta={`${formatDate(task.deadline)} • просрочено ${overdueDays} дн.`}
                tone="danger"
              />
            );
          }) : (
            <EmptyDetail text="Просроченных задач нет" />
          )}
        </div>
      </div>
    );
  }

  if (cardId === 'crm') {
    const total = Math.max(stats.crmCount || 0, 1);
    return (
      <div className="space-y-3">
        <div>
          <div className="text-sm font-medium text-white/80">Структура CRM-пайплайна</div>
          <div className="text-2xs text-white/25">Распределение лидов по основным стадиям</div>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {stats.stageRows.map((stage) => (
            <DetailRow
              key={stage.key}
              title={stage.label}
              subtitle={`${stage.count} лидов`}
              meta={`${Math.round((stage.count / total) * 100)}% от CRM`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (cardId === 'conversion') {
    const trend = stats.conversionTrend;
    return (
      <div className="space-y-3">
        <div>
          <div className="text-sm font-medium text-white/80">Тренд конверсии</div>
          <div className="text-2xs text-white/25">Сравнение последних {CONVERSION_PERIOD_DAYS} дней с предыдущим периодом</div>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <DetailMetric
            label="Текущий период"
            value={trend.currentRate != null ? `${trend.currentRate}%` : '—'}
            note={`${trend.currentWon}/${trend.currentTotal} выигранных`}
          />
          <DetailMetric
            label="Предыдущий период"
            value={trend.previousRate != null ? `${trend.previousRate}%` : '—'}
            note={`${trend.previousWon}/${trend.previousTotal} выигранных`}
          />
          <DetailMetric
            label="Дельта"
            value={trend.delta != null ? `${trend.delta > 0 ? '+' : ''}${trend.delta} п.п.` : '—'}
            note="Считается по дате создания или обновления лида"
          />
        </div>
      </div>
    );
  }

  const delta = stats.avgCycleDays != null ? stats.avgCycleDays - stats.industryBenchmarkDays : null;
  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-medium text-white/80">Цикл сделки vs benchmark</div>
        <div className="text-2xs text-white/25">Сравнение текущего среднего времени сделки с референсом по отрасли</div>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <DetailMetric
          label="Текущий цикл"
          value={stats.avgCycleDays != null ? `${stats.avgCycleDays} дн.` : '—'}
          note="Считается по закрытым CRM-лидам"
        />
        <DetailMetric
          label="Benchmark"
          value={`${stats.industryBenchmarkDays} дн.`}
          note="Практический ориентир для сервисной B2B-воронки"
        />
        <DetailMetric
          label="Отклонение"
          value={delta != null ? `${delta > 0 ? '+' : ''}${delta} дн.` : '—'}
          note={delta == null ? 'Недостаточно закрытых сделок' : delta <= 0 ? 'Идёте быстрее benchmark' : 'Есть запас для сокращения цикла'}
        />
      </div>
    </div>
  );
}

function DetailRow({ title, subtitle, meta, tone = 'default' }) {
  return (
    <div className={`rounded-xl border px-3 py-3 ${
      tone === 'danger'
        ? 'border-craft-red/20 bg-craft-red/5'
        : 'border-white/[0.06] bg-white/[0.03]'
    }`}>
      <div className="text-sm text-white/75 truncate">{title}</div>
      <div className="text-2xs text-white/30 mt-1">{subtitle}</div>
      <div className="text-2xs text-white/20 mt-2">{meta}</div>
    </div>
  );
}

function DetailMetric({ label, value, note }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-3">
      <div className="text-2xs text-white/30">{label}</div>
      <div className="mt-2 text-xl font-display text-white/80">{value}</div>
      <div className="text-2xs text-white/20 mt-2">{note}</div>
    </div>
  );
}

function EmptyDetail({ text }) {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-3 py-6 text-center text-2xs text-white/20 md:col-span-2 xl:col-span-3">
      {text}
    </div>
  );
}

function AnimatedValue({ value }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.8 });
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  const suffix = typeof value === 'string' ? String(value).replace(String(n), '') : '';
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, latest => Math.round(latest));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const unsub = rounded.on('change', v => setDisplay(v));
    return () => unsub();
  }, [rounded]);

  useEffect(() => {
    if (!inView || Number.isNaN(n)) return;
    const controls = animate(mv, n, { duration: 0.9, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [inView, mv, n]);

  if (Number.isNaN(n)) return <span>{value}</span>;
  return <span ref={ref}>{display}{suffix}</span>;
}

function calcAvgCycle(tasks) {
  const closed = tasks.filter(t =>
    (t.statusKey === 'contract' || t.statusKey === 'projectOpened') && t.createdAt
  );
  if (closed.length === 0) return null;

  let totalDays = 0;
  for (const t of closed) {
    const start = new Date(t.createdAt);
    const end = t.updatedAt ? new Date(t.updatedAt) : new Date();
    const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    totalDays += days;
  }
  return Math.round(totalDays / closed.length);
}

function IconTasks() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="3" y="3" width="14" height="14" rx="3" /><path d="M7 10l2 2 4-4" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
      <circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 2.5" />
    </svg>
  );
}
function IconFunnel() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M3 4h14l-2 12H5L3 4z" /><path d="M7 4V2h6v2" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M3 17V8l4-5h6l4 5v9" /><path d="M7 17v-5h6v5" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="3" y="4" width="14" height="13" rx="2" /><path d="M3 8h14M7 2v4M13 2v4" />
    </svg>
  );
}
