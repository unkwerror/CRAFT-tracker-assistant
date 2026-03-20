'use client';
import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TABS = [
  { key: 'conversion', label: 'Воронка' },
  { key: 'velocity', label: 'Velocity' },
  { key: 'scoring', label: 'Скоринг' },
  { key: 'forecast', label: 'Прогноз выручки' },
  { key: 'anomalies', label: 'Аномалии' },
  { key: 'cohorts', label: 'Когорты' },
  { key: 'kpi', label: 'KPI менеджеров' },
  { key: 'winloss', label: 'Win/Loss' },
  { key: 'segments', label: 'Сегменты' },
  { key: 'trend', label: 'Тренд создания' },
  { key: 'revforecast', label: 'Forecast 3 периода' },
];

function fmtMoney(n) {
  const value = Number(n) || 0;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} млрд`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)} млн`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)} тыс`;
  return `${Math.round(value)}`;
}

function pct(v) {
  if (v == null) return '—';
  if (typeof v === 'number' && v <= 1) return `${Math.round(v * 100)}%`;
  return `${Math.round(v)}%`;
}

function Empty({ text = 'Нет данных' }) {
  return <div className="text-center py-8 text-2xs text-white/20">{text}</div>;
}

export default function CrmAnalytics({ trackerConnected = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('conversion');
  const [cohort, setCohort] = useState('month');
  const [manager, setManager] = useState('');

  useEffect(() => {
    if (!trackerConnected) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const q = new URLSearchParams({
      ml: 'true',
      changelog: 'true',
      cohort,
    });
    if (manager) q.set('managerId', manager);
    fetch(`/api/analytics/crm?${q.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d.analytics || null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [trackerConnected, cohort, manager]);

  const managerOptions = useMemo(
    () => (data?.managerKPI || []).map((m) => m.manager).filter(Boolean),
    [data]
  );

  const handleExport = () => {
    window.open('/api/export/crm', '_blank');
  };

  if (!trackerConnected) {
    return (
      <div className="bg-craft-surface border border-craft-border rounded-xl p-8 text-center">
        <div className="text-white/20 text-sm">Подключите Трекер для аналитики</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-craft-surface border border-craft-border rounded-xl p-10 flex justify-center">
        <div className="w-6 h-6 border-2 border-white/5 border-t-craft-purple/50 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-craft-surface border border-craft-border rounded-xl p-8 text-center">
        <div className="text-craft-red/60 text-sm">Ошибка аналитики</div>
        <div className="text-2xs text-white/20 mt-1">{error}</div>
      </div>
    );
  }

  if (!data || data.empty) {
    return (
      <div className="bg-craft-surface border border-craft-border rounded-xl p-8 text-center">
        <div className="text-white/20 text-sm">Недостаточно данных для анализа</div>
        <div className="text-2xs text-white/10 mt-1">Добавьте лиды в CRM-очередь</div>
      </div>
    );
  }

  return (
    <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden hover:border-craft-border2 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-craft-border">
        <h2 className="text-[13px] font-display font-medium tracking-tight">CRM Аналитика</h2>
        <div className="flex items-center gap-2">
          <select
            value={cohort}
            onChange={(e) => setCohort(e.target.value)}
            className="text-2xs bg-white/[0.05] border border-white/[0.08] rounded-md px-2 py-1 text-white/70"
          >
            <option value="month">Когорты: месяц</option>
            <option value="quarter">Когорты: квартал</option>
          </select>
          <select
            value={manager}
            onChange={(e) => setManager(e.target.value)}
            className="text-2xs bg-white/[0.05] border border-white/[0.08] rounded-md px-2 py-1 text-white/70"
          >
            <option value="">Все менеджеры</option>
            {managerOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <button
            onClick={handleExport}
            className="text-2xs px-2.5 py-1.5 rounded-md bg-craft-accent/15 text-craft-accent hover:bg-craft-accent/25 transition-colors"
          >
            Экспорт CSV
          </button>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-craft-border flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-[10px] px-2.5 py-1 rounded-md transition-colors ${
              tab === t.key
                ? 'bg-craft-accent/15 text-craft-accent'
                : 'text-white/25 hover:text-white/40 hover:bg-white/[0.04]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'conversion' && <ConversionTab conversion={data.conversion} />}
            {tab === 'velocity' && <VelocityTab velocity={data.velocityChangelog || data.velocity} />}
            {tab === 'scoring' && <ScoringTab scores={data.scores} mlScores={data.mlScores} />}
            {tab === 'forecast' && <PipelineForecastTab forecast={data.forecast} />}
            {tab === 'anomalies' && <AnomaliesTab anomalies={data.anomalies} />}
            {tab === 'cohorts' && <CohortsTab cohorts={data.cohorts} />}
            {tab === 'kpi' && <KpiTab rows={data.managerKPI} />}
            {tab === 'winloss' && <WinLossTab winLoss={data.winLoss} />}
            {tab === 'segments' && <SegmentsTab segments={data.segments} />}
            {tab === 'trend' && <TrendTab trend={data.creationTrend} byPeriod={data.conversionByPeriod} />}
            {tab === 'revforecast' && <RevenueForecastTab revenueForecast={data.revenueForecast} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function ConversionTab({ conversion }) {
  if (!conversion || conversion.length === 0) return <Empty text="Нет данных по воронке" />;
  const max = Math.max(...conversion.map((r) => r.fromCount || 0), 1);
  return (
    <div className="space-y-2">
      <div className="text-2xs text-white/25 mb-3">Конверсия между стадиями</div>
      {conversion.map((row) => (
        <div key={`${row.from}-${row.to}`} className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-2.5">
          <div className="flex justify-between text-2xs mb-1">
            <span className="text-white/45">{row.fromLabel} → {row.toLabel}</span>
            <span className="text-craft-accent">{pct(row.rate)}</span>
          </div>
          <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden mb-1">
            <div className="h-full bg-craft-accent/50 rounded-full" style={{ width: `${Math.max((row.toCount / max) * 100, 3)}%` }} />
          </div>
          <div className="text-2xs text-white/20">{row.toCount} / {row.fromCount}</div>
        </div>
      ))}
    </div>
  );
}

function VelocityTab({ velocity }) {
  if (!velocity || velocity.length === 0) return <Empty text="Недостаточно данных velocity" />;
  const maxMedian = Math.max(...velocity.map((v) => v.median || 0), 1);
  return (
    <div className="space-y-3">
      <div className="text-2xs text-white/25 mb-1">Медиана дней на стадии</div>
      {velocity.map((v) => (
        <div key={v.stage}>
          <div className="flex justify-between text-2xs mb-1">
            <span className="text-white/40">{v.label}</span>
            <span className="text-white/60 tabular-nums">
              {v.median ?? '—'} дн <span className="text-white/20">(avg {v.avg ?? '—'})</span>
            </span>
          </div>
          <div className="h-3 bg-white/[0.03] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-craft-purple/45" style={{ width: `${v.median ? (v.median / maxMedian) * 100 : 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoringTab({ scores, mlScores }) {
  if (!scores || scores.length === 0) return <Empty text="Нет данных для скоринга" />;
  const top = scores.slice(0, 12);
  return (
    <div className="space-y-2">
      <div className="text-2xs text-white/25 mb-3">Скоринг из API (`analytics.scores`), топ лидов</div>
      {top.map((s) => (
        <div key={s.key} className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-2xs text-white/55 truncate">
              <span className="text-white/25 font-mono mr-1.5">{s.key}</span>{s.summary}
            </div>
            <span className={`text-sm font-display ${s.score >= 70 ? 'text-craft-green' : s.score >= 40 ? 'text-craft-orange' : 'text-craft-red'}`}>{s.score}</span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {[
              ['budget', s.breakdown?.budgetScore],
              ['source', s.breakdown?.sourceScore],
              ['type', s.breakdown?.typeScore],
              ['age', s.breakdown?.ageScore],
              ['stage', s.breakdown?.stageScore],
            ].map(([label, val]) => (
              <div key={label} className="text-center bg-white/[0.03] rounded py-1">
                <div className="text-2xs text-white/20 uppercase">{label}</div>
                <div className="text-2xs text-white/60">{val ?? '—'}</div>
              </div>
            ))}
          </div>
          {Array.isArray(mlScores) && (
            <div className="text-2xs text-white/25 mt-2">
              ML: {mlScores.find((m) => m.key === s.key)?.mlPrediction ?? '—'}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PipelineForecastTab({ forecast }) {
  if (!forecast || forecast.totalRaw === 0) return <Empty text="Нет данных о бюджетах" />;
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white/[0.03] rounded-xl p-4">
          <div className="text-2xs text-white/25 mb-1">Общий pipeline</div>
          <div className="text-xl font-display text-white/70">{fmtMoney(forecast.totalRaw)} ₽</div>
        </div>
        <div className="bg-white/[0.03] rounded-xl p-4">
          <div className="text-2xs text-white/25 mb-1">Взвешенный прогноз</div>
          <div className="text-xl font-display text-craft-green">{fmtMoney(forecast.totalWeighted)} ₽</div>
        </div>
      </div>
      <div className="space-y-2">
        {(forecast.byStage || []).map((s) => (
          <div key={s.stage} className="flex items-center justify-between text-2xs">
            <div className="flex items-center gap-2">
              <span className="text-white/40">{s.label}</span>
              <span className="text-white/15">({s.count})</span>
              <span className="text-white/10">×{Math.round((s.weight || 0) * 100)}%</span>
            </div>
            <div className="flex gap-4">
              <span className="text-white/30 tabular-nums">{fmtMoney(s.raw)} ₽</span>
              <span className="text-craft-green/70 tabular-nums">{fmtMoney(Math.round(s.weighted || 0))} ₽</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnomaliesTab({ anomalies }) {
  if (!anomalies || anomalies.length === 0) return <Empty text="Аномалий не обнаружено" />;
  return (
    <div className="space-y-2">
      {anomalies.map((a) => (
        <div key={a.key} className="flex items-center gap-3 bg-craft-red/5 border border-craft-red/10 rounded-lg p-3">
          <div className="text-sm font-display text-craft-red font-medium w-10 text-center">{a.zScore?.toFixed?.(1) ?? a.zScore}</div>
          <div className="flex-1 min-w-0">
            <div className="text-2xs text-white/60 truncate">{a.summary}</div>
            <div className="text-2xs text-white/25">{a.key} • {a.status} • {a.daysSinceUpdate}д без обновлений</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CohortsTab({ cohorts }) {
  if (!cohorts || cohorts.length === 0) return <Empty text="Нет когортных данных" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-2xs">
        <thead className="text-white/30">
          <tr>
            <th className="text-left pb-2">Период</th>
            <th className="text-right pb-2">Всего</th>
            <th className="text-right pb-2">Won</th>
            <th className="text-right pb-2">Lost</th>
            <th className="text-right pb-2">Conv</th>
            <th className="text-right pb-2">Avg budget</th>
            <th className="text-right pb-2">Cycle</th>
          </tr>
        </thead>
        <tbody className="text-white/60">
          {cohorts.map((c) => (
            <tr key={c.period} className="border-t border-white/[0.05]">
              <td className="py-2">{c.period}</td>
              <td className="py-2 text-right">{c.total}</td>
              <td className="py-2 text-right">{c.won}</td>
              <td className="py-2 text-right">{c.lost}</td>
              <td className="py-2 text-right">{c.conversionRate != null ? `${c.conversionRate}%` : '—'}</td>
              <td className="py-2 text-right">{c.avgBudget ? `${fmtMoney(c.avgBudget)} ₽` : '—'}</td>
              <td className="py-2 text-right">{c.medianCycleDays ?? '—'} д</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KpiTab({ rows }) {
  if (!rows || rows.length === 0) return <Empty text="Нет KPI менеджеров" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-2xs">
        <thead className="text-white/30">
          <tr>
            <th className="text-left pb-2">Менеджер</th>
            <th className="text-right pb-2">Won</th>
            <th className="text-right pb-2">Lost</th>
            <th className="text-right pb-2">Revenue</th>
            <th className="text-right pb-2">Avg cycle</th>
          </tr>
        </thead>
        <tbody className="text-white/60">
          {rows.map((r) => (
            <tr key={r.manager} className="border-t border-white/[0.05]">
              <td className="py-2">{r.manager}</td>
              <td className="py-2 text-right">{r.won}</td>
              <td className="py-2 text-right">{r.lost}</td>
              <td className="py-2 text-right">{fmtMoney(r.totalRevenue)} ₽</td>
              <td className="py-2 text-right">{r.medianCycleDays ?? '—'} д</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WinLossTab({ winLoss }) {
  if (!winLoss) return <Empty text="Нет данных win/loss" />;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Won" value={winLoss.wonCount} />
        <StatCard title="Lost" value={winLoss.lostCount} />
        <StatCard title="Общая конверсия" value={winLoss.overallRate != null ? `${winLoss.overallRate}%` : '—'} />
        <StatCard title="Avg won budget" value={winLoss.avgWonBudget ? `${fmtMoney(winLoss.avgWonBudget)} ₽` : '—'} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SimpleRank title="По источникам" rows={winLoss.sourceConversion?.map((r) => ({ label: r.source, rate: r.rate, won: r.won, lost: r.lost })) || []} />
        <SimpleRank title="По типам объектов" rows={winLoss.typeConversion?.map((r) => ({ label: r.type, rate: r.rate, won: r.won, lost: r.lost })) || []} />
      </div>
    </div>
  );
}

function SegmentsTab({ segments }) {
  if (!segments || segments.tooFewLeads) return <Empty text="Недостаточно лидов для сегментации" />;
  if (!segments.segments || segments.segments.length === 0) return <Empty text="Нет сегментов" />;
  return (
    <div className="space-y-2">
      {segments.segments.map((s) => (
        <div key={s.id} className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3">
          <div className="flex justify-between items-center mb-1">
            <div className="text-2xs text-white/60">Кластер #{s.id}</div>
            <div className="text-2xs text-white/30">{s.count} лидов</div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-2xs">
            <div className="bg-white/[0.03] rounded p-2 text-center">
              <div className="text-white/25">Avg budget</div>
              <div className="text-white/65">{fmtMoney(s.avgBudget)} ₽</div>
            </div>
            <div className="bg-white/[0.03] rounded p-2 text-center">
              <div className="text-white/25">Median age</div>
              <div className="text-white/65">{s.medianAge} д</div>
            </div>
            <div className="bg-white/[0.03] rounded p-2 text-center">
              <div className="text-white/25">Centroid</div>
              <div className="text-white/65">{(s.centroid || []).join(' / ')}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendTab({ trend, byPeriod }) {
  if (!trend || !Array.isArray(trend.buckets) || trend.buckets.length === 0) return <Empty text="Недостаточно данных тренда" />;
  const max = Math.max(...trend.buckets, 1);
  return (
    <div className="space-y-5">
      <div>
        <div className="text-2xs text-white/25 mb-2">Создание лидов по неделям</div>
        <div className="grid grid-cols-8 gap-1">
          {trend.buckets.map((v, i) => (
            <div key={i} className="bg-white/[0.02] rounded p-1.5">
              <div className="h-14 flex items-end">
                <div className="w-full bg-craft-cyan/50 rounded-sm" style={{ height: `${Math.max((v / max) * 100, 6)}%` }} />
              </div>
              <div className="text-2xs text-center text-white/30 mt-1">{v}</div>
            </div>
          ))}
        </div>
        <div className="text-2xs text-white/25 mt-2">
          Regression slope: <span className={trend.regression?.slope > 0 ? 'text-craft-green' : 'text-craft-red'}>{trend.regression?.slope ?? 0}</span>,
          r2: {trend.regression?.r2 ?? '—'}
        </div>
      </div>
      <div>
        <div className="text-2xs text-white/25 mb-2">Conversion by period</div>
        {!byPeriod || byPeriod.length === 0 ? <Empty text="Нет данных по периодам" /> : (
          <div className="space-y-1.5">
            {byPeriod.map((p) => (
              <div key={p.period} className="flex justify-between text-2xs border-b border-white/[0.04] pb-1">
                <span className="text-white/45">{p.period}</span>
                <span className="text-white/60">{p.won}/{p.won + p.lost} • {p.rate != null ? `${p.rate}%` : '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RevenueForecastTab({ revenueForecast }) {
  if (!revenueForecast || !Array.isArray(revenueForecast.forecast) || revenueForecast.forecast.length === 0) {
    return <Empty text="Недостаточно данных для прогноза на 3 периода" />;
  }
  return (
    <div className="space-y-3">
      <div className="text-2xs text-white/25">
        Метод: {revenueForecast.method || '—'}
        {revenueForecast.r2 != null ? ` • r2: ${revenueForecast.r2}` : ''}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {revenueForecast.forecast.slice(0, 3).map((v, i) => (
          <div key={i} className="bg-white/[0.03] rounded-lg p-3 text-center">
            <div className="text-2xs text-white/25 mb-1">Период +{i + 1}</div>
            <div className="text-sm font-display text-craft-green">{fmtMoney(v)} ₽</div>
          </div>
        ))}
      </div>
      {Array.isArray(revenueForecast.forecast) && (
        <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-craft-purple/50 to-craft-green/50"
            style={{ width: `${Math.min(100, Math.max(20, (revenueForecast.forecast[0] || 0) / ((revenueForecast.forecast[2] || 1)) * 100))}%` }}
          />
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-white/[0.03] rounded-lg p-3">
      <div className="text-2xs text-white/25 mb-1">{title}</div>
      <div className="text-sm font-display text-white/70">{value}</div>
    </div>
  );
}

function SimpleRank({ title, rows }) {
  if (!rows || rows.length === 0) return <Empty text={`${title}: нет данных`} />;
  return (
    <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.05]">
      <div className="text-2xs text-white/25 mb-2">{title}</div>
      <div className="space-y-1.5">
        {rows.slice(0, 8).map((r) => (
          <div key={r.label} className="flex justify-between text-2xs">
            <span className="text-white/45 truncate pr-2">{r.label}</span>
            <span className="text-white/65">{r.rate}% ({r.won}/{r.won + r.lost})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
