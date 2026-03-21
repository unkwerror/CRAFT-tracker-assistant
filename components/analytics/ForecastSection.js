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

function fmtMoney(n) {
  const v = Number(n) || 0;
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)} млрд`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)} млн`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)} тыс`;
  return `${Math.round(v)}`;
}

export default function ForecastSection({ analytics, loading }) {
  if (loading) return <SectionSkeleton />;

  const forecast = analytics?.forecast;
  const revenueForecast = analytics?.revenueForecast;

  // Pipeline waterfall: raw vs weighted per stage
  const stages = forecast?.byStage || [];
  const pipelineOption = stages.length === 0 ? null : {
    tooltip: {
      trigger: 'axis',
      formatter: (params) =>
        `${params[0].axisValue}<br/>` +
        params.map((p) => `${p.marker} ${p.seriesName}: ${fmtMoney(p.value)} ₽`).join('<br/>'),
    },
    legend: { data: ['Весь pipeline', 'Взвешенный'], top: 4, right: 8 },
    xAxis: { type: 'value', axisLabel: { formatter: (v) => fmtMoney(v) } },
    yAxis: {
      type: 'category',
      data: stages.map((s) => s.label || s.stage),
      axisLabel: { width: 100, overflow: 'truncate', fontSize: 10 },
    },
    grid: { left: 110, right: 24, top: 32, bottom: 24 },
    series: [
      {
        name: 'Весь pipeline',
        type: 'bar',
        data: stages.map((s) => s.raw || 0),
        itemStyle: { borderRadius: [0, 3, 3, 0], opacity: 0.45 },
      },
      {
        name: 'Взвешенный',
        type: 'bar',
        data: stages.map((s) => Math.round(s.weighted || 0)),
        itemStyle: { borderRadius: [0, 3, 3, 0] },
        label: {
          show: true,
          position: 'right',
          formatter: (p) => p.value > 0 ? `${fmtMoney(p.value)} ₽` : '',
          fontSize: 11,
        },
      },
    ],
  };

  // Time-series forecast: 3 periods
  const forecastData = revenueForecast?.forecast || [];
  const forecastOption = forecastData.length === 0 ? null : {
    tooltip: { trigger: 'axis', formatter: (p) => `${p[0].axisValue}: ${fmtMoney(p[0].value)} ₽` },
    xAxis: {
      type: 'category',
      data: forecastData.map((_, i) => `Период +${i + 1}`),
      boundaryGap: false,
    },
    yAxis: { type: 'value', axisLabel: { formatter: (v) => fmtMoney(v) } },
    grid: { left: 64, right: 24, top: 16, bottom: 32 },
    series: [
      {
        type: 'line',
        name: 'Прогноз',
        data: forecastData,
        areaStyle: { opacity: 0.15 },
        smooth: true,
        symbolSize: 10,
        label: { show: true, position: 'top', formatter: (p) => `${fmtMoney(p.value)} ₽`, fontSize: 12 },
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {forecast && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-craft-surface border border-craft-border rounded-xl p-5">
            <div className="text-xs text-craft-muted mb-1.5">Весь pipeline</div>
            <div className="text-2xl font-display font-light text-white/70">
              {fmtMoney(forecast.totalRaw)} ₽
            </div>
            <div className="text-xs text-craft-muted mt-1">Сумма бюджетов всех лидов</div>
          </div>
          <div className="bg-craft-surface border border-craft-border rounded-xl p-5">
            <div className="text-xs text-craft-muted mb-1.5">Взвешенный прогноз</div>
            <div className="text-2xl font-display font-light text-craft-green">
              {fmtMoney(forecast.totalWeighted)} ₽
            </div>
            <div className="text-xs text-craft-muted mt-1">С учётом вероятности закрытия</div>
          </div>
          <div className="bg-craft-surface border border-craft-border rounded-xl p-5">
            <div className="text-xs text-craft-muted mb-1.5">Активных стадий</div>
            <div className="text-2xl font-display font-light text-craft-accent">
              {stages.length}
            </div>
            <div className="text-xs text-craft-muted mt-1">
              {revenueForecast
                ? `Метод прогноза: ${revenueForecast.method}${revenueForecast.r2 != null ? ` (r²=${revenueForecast.r2})` : ''}`
                : 'Прогноз недоступен'}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline by stage */}
        <div className="bg-craft-surface border border-craft-border rounded-xl p-4">
          <h3 className="text-xs font-medium text-craft-muted mb-3">Pipeline по стадиям</h3>
          {pipelineOption
            ? <CraftChart option={pipelineOption} style={{ height: 220 }} />
            : <SectionEmpty text="Нет данных о бюджетах" />}
        </div>

        {/* Time-series forecast */}
        <div className="bg-craft-surface border border-craft-border rounded-xl p-4">
          <h3 className="text-xs font-medium text-craft-muted mb-3">Прогноз на 3 периода</h3>
          {forecastOption
            ? <CraftChart option={forecastOption} style={{ height: 220 }} />
            : <SectionEmpty text="Нужно минимум 4 месяца данных для прогноза" />}
        </div>
      </div>

      {/* Stage table */}
      {stages.length > 0 && (
        <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-craft-border">
            <h3 className="text-xs font-medium text-craft-muted">Разбивка по стадиям</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-craft-border">
                  <th className="text-left px-4 py-2.5 text-craft-muted font-medium">Стадия</th>
                  <th className="text-right px-4 py-2.5 text-craft-muted font-medium">Лидов</th>
                  <th className="text-right px-4 py-2.5 text-craft-muted font-medium">Вес</th>
                  <th className="text-right px-4 py-2.5 text-craft-muted font-medium">Pipeline</th>
                  <th className="text-right px-4 py-2.5 text-craft-muted font-medium">Взвешенный</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((s) => (
                  <tr key={s.stage} className="border-b border-craft-border/50 hover:bg-craft-surface2/50">
                    <td className="px-4 py-2.5 text-white/70">{s.label || s.stage}</td>
                    <td className="px-4 py-2.5 text-right text-white/50">{s.count}</td>
                    <td className="px-4 py-2.5 text-right text-white/50">
                      {s.weight != null ? `${Math.round(s.weight * 100)}%` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-white/50">{fmtMoney(s.raw)} ₽</td>
                    <td className="px-4 py-2.5 text-right text-craft-green font-medium">
                      {fmtMoney(Math.round(s.weighted || 0))} ₽
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
