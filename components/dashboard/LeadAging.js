'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import CraftChart from '@/components/ui/CraftChart';
import WidgetDebugBadge from './WidgetDebugBadge';

async function readAnalyticsJson(r) {
  let data = {};
  try {
    data = await r.json();
  } catch {
    /* non-JSON */
  }
  if (!r.ok) {
    throw new Error(
      data.error || (r.status === 503 ? 'Сервис недоступен' : `Ошибка ${r.status}`)
    );
  }
  return data;
}

const AGE_BUCKETS = ['0-7д', '8-14д', '15-30д', '31-60д', '60д+'];

function classifyAge(days) {
  if (days <= 7) return 0;
  if (days <= 14) return 1;
  if (days <= 30) return 2;
  if (days <= 60) return 3;
  return 4;
}

export default function LeadAging({ trackerConnected = false }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadLeads = useCallback(() => {
    if (!trackerConnected) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch('/api/analytics/crm')
      .then(readAnalyticsJson)
      .then((d) => {
        const anomalies = d.analytics?.anomalies || [];
        setLeads(anomalies);
      })
      .catch((e) => {
        setError(e.message);
        setLeads([]);
      })
      .finally(() => setLoading(false));
  }, [trackerConnected]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const { stages, heatmapData, maxVal } = useMemo(() => {
    const stageSet = [...new Set(leads.map((l) => l.status || 'Неизвестно'))].slice(0, 8);
    const matrix = new Map();
    for (const stage of stageSet) {
      matrix.set(stage, new Array(AGE_BUCKETS.length).fill(0));
    }
    for (const lead of leads) {
      const stage = lead.status || 'Неизвестно';
      if (!matrix.has(stage)) continue;
      const bucketIdx = classifyAge(Number(lead.daysSinceUpdate || 0));
      matrix.get(stage)[bucketIdx] += 1;
    }
    const flat = [];
    let max = 0;
    const stageArr = [...matrix.keys()];
    for (let si = 0; si < stageArr.length; si++) {
      const row = matrix.get(stageArr[si]);
      for (let bi = 0; bi < AGE_BUCKETS.length; bi++) {
        flat.push([bi, si, row[bi]]);
        if (row[bi] > max) max = row[bi];
      }
    }
    return { stages: stageArr, heatmapData: flat, maxVal: max };
  }, [leads]);

  if (!trackerConnected) {
    return (
      <div className="bg-craft-surface border border-craft-border rounded-2xl p-6 text-center">
        <div className="text-white/20 text-2xs">Подключите Трекер</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-craft-surface border border-craft-border rounded-2xl p-8 flex justify-center">
        <div className="w-5 h-5 border-2 border-white/5 border-t-craft-orange/40 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-craft-surface border border-craft-border rounded-2xl p-8 text-center">
        <div className="text-craft-red/60 mb-2">Ошибка загрузки</div>
        <div className="text-2xs text-white/15 mb-3">{error}</div>
        <button
          type="button"
          onClick={() => loadLeads()}
          className="text-craft-accent/70 hover:text-craft-accent text-2xs"
        >
          Повторить
        </button>
      </div>
    );
  }

  const chartOption = {
    grid: { top: 18, right: 14, bottom: 30, left: 80, containLabel: false },
    xAxis: {
      type: 'category',
      data: AGE_BUCKETS,
      splitArea: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 10 },
    },
    yAxis: {
      type: 'category',
      data: stages,
      splitArea: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 10 },
    },
    visualMap: {
      min: 0,
      max: Math.max(maxVal, 1),
      calculable: false,
      show: false,
      inRange: {
        color: ['rgba(255,255,255,0.03)', 'rgb(var(--craft-orange))', 'rgb(var(--craft-red))'],
      },
    },
    series: [
      {
        type: 'heatmap',
        data: heatmapData,
        label: { show: false },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' },
        },
        itemStyle: {
          borderWidth: 2,
          borderColor: 'rgb(var(--craft-surface))',
          borderRadius: 3,
        },
      },
    ],
    tooltip: {
      formatter: (params) => {
        const [bIdx, sIdx, val] = params.data;
        return `${stages[sIdx]}: ${AGE_BUCKETS[bIdx]} — <b>${val}</b> лидов`;
      },
    },
  };

  return (
    <div className="bg-craft-surface border border-craft-border rounded-2xl overflow-hidden hover:border-craft-border2 transition-colors">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-craft-border">
        <h2 className="text-[13px] font-display font-medium tracking-tight">Застрявшие лиды</h2>
        <span className="text-[10px] text-white/20">{leads.length} шт</span>
      </div>
      <div className="px-4 pt-3">
        <WidgetDebugBadge
          title="Lead Aging"
          endpoint="/api/analytics/crm"
          metrics={{
            anomalies: leads.length,
            heatmapStages: stages.length,
          }}
          note="Используется analytics.anomalies из CRM analytics endpoint"
        />
      </div>

      {leads.length === 0 ? (
        <div className="p-8 text-center">
          <div className="text-craft-green text-sm mb-1">Всё актуально</div>
          <div className="text-2xs text-white/20">Нет застрявших лидов</div>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <div className="h-48 bg-craft-bg/35 rounded-lg border border-white/[0.06] overflow-hidden">
            <CraftChart option={chartOption} style={{ height: '100%', width: '100%' }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {leads.slice(0, 8).map((lead) => {
              const severity = lead.daysSinceUpdate > 30 ? 'critical' : lead.daysSinceUpdate > 14 ? 'warning' : 'info';
              const colors = {
                critical: 'border-craft-red/30 bg-craft-red/5',
                warning: 'border-craft-orange/30 bg-craft-orange/5',
                info: 'border-white/10 bg-white/[0.02]',
              };
              const textColor = {
                critical: 'text-craft-red',
                warning: 'text-craft-orange',
                info: 'text-white/50',
              };

              return (
                <div key={lead.key} className={`rounded-lg border p-3 ${colors[severity]} transition-colors`}>
                  <div className="flex items-start justify-between mb-1.5">
                    <span className="text-2xs font-mono text-white/25">{lead.key}</span>
                    <span className={`text-2xs font-medium ${textColor[severity]}`}>{lead.daysSinceUpdate}д</span>
                  </div>
                  <div className="text-[12px] text-white/60 line-clamp-2 mb-1">{lead.summary}</div>
                  <div className="text-2xs text-white/25">{lead.status}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
