'use client';
import CraftChart from '@/components/ui/CraftChart';

function SectionEmpty({ text = 'Недостаточно данных' }) {
  return <div className="flex items-center justify-center h-40 text-xs text-craft-muted">{text}</div>;
}

function SectionSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-craft-surface2 rounded w-1/3" />
      <div className="h-48 bg-craft-surface2 rounded-lg" />
    </div>
  );
}

function zScoreColor(z) {
  if (z >= 3) return 'text-craft-red';
  if (z >= 2) return 'text-craft-orange';
  return 'text-craft-muted';
}

export default function TrendsSection({ analytics, loading }) {
  if (loading) return <SectionSkeleton />;

  const trend = analytics?.creationTrend;
  const byPeriod = analytics?.conversionByPeriod || [];
  const anomalies = analytics?.anomalies || [];

  const weeks = trend?.buckets?.length || 0;
  const weekLabels = Array.from({ length: weeks }, (_, i) =>
    i === weeks - 1 ? 'Эта нед.' : i === weeks - 2 ? 'Пред. нед.' : `−${weeks - 1 - i}н`
  );

  // Regression line overlay
  const reg = trend?.regression;
  const regressionPoints = reg
    ? trend.buckets.map((_, i) => Math.round(reg.intercept + reg.slope * i))
    : [];

  const trendOption = !trend || weeks === 0 ? null : {
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { data: ['Новых лидов', 'Тренд'], top: 4, right: 8 },
    xAxis: { type: 'category', data: weekLabels, boundaryGap: true },
    yAxis: { type: 'value', minInterval: 1 },
    grid: { left: 40, right: 16, top: 32, bottom: 32 },
    series: [
      {
        name: 'Новых лидов',
        type: 'bar',
        data: trend.buckets,
        itemStyle: { borderRadius: [3, 3, 0, 0] },
      },
      {
        name: 'Тренд',
        type: 'line',
        data: regressionPoints,
        smooth: true,
        symbolSize: 0,
        lineStyle: { type: 'dashed', width: 2 },
        z: 5,
      },
    ],
  };

  // Conversion by period
  const convPeriodOption = byPeriod.length === 0 ? null : {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Выиграно', 'Проиграно'], top: 4, right: 8 },
    xAxis: { type: 'category', data: byPeriod.map((p) => p.period), axisLabel: { rotate: 30, fontSize: 10 } },
    yAxis: { type: 'value', minInterval: 1 },
    grid: { left: 36, right: 16, top: 32, bottom: 48 },
    series: [
      {
        name: 'Выиграно',
        type: 'bar',
        stack: 'total',
        data: byPeriod.map((p) => p.won),
        itemStyle: { borderRadius: [0, 0, 0, 0] },
      },
      {
        name: 'Проиграно',
        type: 'bar',
        stack: 'total',
        data: byPeriod.map((p) => p.lost),
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Creation trend */}
        <div className="bg-craft-surface border border-craft-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-craft-muted">Создание лидов по неделям</h3>
            {reg && (
              <span className={`text-xs font-mono ${reg.slope > 0 ? 'text-craft-green' : 'text-craft-red'}`}>
                slope {reg.slope > 0 ? '↑' : '↓'}{Math.abs(reg.slope)}
                {reg.r2 != null && ` · r²=${reg.r2}`}
              </span>
            )}
          </div>
          {trendOption
            ? <CraftChart option={trendOption} style={{ height: 200 }} />
            : <SectionEmpty text="Нет данных о создании лидов" />}
        </div>

        {/* Conversion by period */}
        <div className="bg-craft-surface border border-craft-border rounded-xl p-4">
          <h3 className="text-xs font-medium text-craft-muted mb-3">Закрытые сделки по периодам</h3>
          {convPeriodOption
            ? <CraftChart option={convPeriodOption} style={{ height: 200 }} />
            : <SectionEmpty text="Нет данных по периодам" />}
        </div>
      </div>

      {/* Anomalies */}
      <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-craft-border">
          <h3 className="text-xs font-medium text-craft-muted">Аномалии — застрявшие лиды</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            anomalies.length === 0
              ? 'bg-craft-green/15 text-craft-green'
              : 'bg-craft-red/15 text-craft-red'
          }`}>
            {anomalies.length === 0 ? 'Всё в порядке' : `${anomalies.length} аномалий`}
          </span>
        </div>

        {anomalies.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-craft-muted">
            Нет застрявших лидов — все обновлялись в ожидаемые сроки
          </div>
        ) : (
          <div className="divide-y divide-craft-border/40">
            {anomalies.map((a) => (
              <div key={a.key} className="flex items-center gap-4 px-4 py-3 hover:bg-craft-surface2/40">
                <div className={`text-base font-display font-medium w-10 text-center tabular-nums ${zScoreColor(a.zScore)}`}>
                  {a.zScore?.toFixed?.(1) ?? a.zScore}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white/70 truncate">{a.summary}</div>
                  <div className="text-xs text-craft-muted mt-0.5">
                    <span className="font-mono">{a.key}</span>
                    {' · '}
                    {a.status}
                    {' · '}
                    <span className={zScoreColor(a.zScore)}>{a.daysSinceUpdate}д без обновлений</span>
                    {a.isP95 && <span className="ml-1.5 text-craft-red text-xs">P95</span>}
                  </div>
                </div>
                <div className="text-xs text-craft-muted shrink-0">
                  z={a.zScore?.toFixed?.(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
