'use client';
import { useState, useEffect } from 'react';
import { ResponsiveHeatMap } from '@nivo/heatmap';

export default function LeadAging({ trackerConnected = false }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!trackerConnected) { setLoading(false); return; }

    fetch('/api/analytics/crm')
      .then(r => r.json())
      .then(d => {
        const anomalies = d.analytics?.anomalies || [];
        setLeads(anomalies);
      })
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, [trackerConnected]);

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

  return (
    <div className="bg-craft-surface border border-craft-border rounded-2xl overflow-hidden hover:border-craft-border2 transition-colors">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-craft-border">
        <h2 className="text-[13px] font-display font-medium tracking-tight">Застрявшие лиды</h2>
        <span className="text-[10px] text-white/20">{leads.length} шт</span>
      </div>

      {leads.length === 0 ? (
        <div className="p-8 text-center">
          <div className="text-craft-green text-sm mb-1">Всё актуально</div>
          <div className="text-2xs text-white/20">Нет застрявших лидов</div>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <div className="h-48 bg-craft-bg/35 rounded-lg border border-white/[0.06] overflow-hidden">
            <ResponsiveHeatMap
              data={buildHeatmapData(leads)}
              margin={{ top: 18, right: 14, bottom: 30, left: 80 }}
              axisTop={null}
              axisRight={null}
              axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: 0 }}
              axisLeft={{ tickSize: 0, tickPadding: 6, tickRotation: 0 }}
              enableLabels={false}
              colors={{ type: 'diverging', scheme: 'red_yellow_blue', divergeAt: 0.9, minValue: 0, maxValue: 5 }}
              emptyColor="rgba(255,255,255,0.03)"
              borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
              theme={{
                axis: { ticks: { text: { fill: 'rgba(255,255,255,0.3)', fontSize: 10 } } },
                grid: { line: { stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 } },
                tooltip: { container: { background: '#151515', color: '#ddd', fontSize: 11, border: '1px solid #2a2a2a' } },
              }}
              tooltip={({ cell }) => (
                <div className="px-2 py-1 rounded bg-craft-surface border border-craft-border text-2xs text-white/70">
                  {cell.serieId}: {cell.data.x} — {cell.value} лидов
                </div>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {leads.slice(0, 8).map(lead => {
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

function buildHeatmapData(leads) {
  const stages = [...new Set(leads.map((l) => l.status || 'Неизвестно'))].slice(0, 8);
  const ageBuckets = ['0-7д', '8-14д', '15-30д', '31-60д', '60д+'];
  const classify = (days) => {
    if (days <= 7) return '0-7д';
    if (days <= 14) return '8-14д';
    if (days <= 30) return '15-30д';
    if (days <= 60) return '31-60д';
    return '60д+';
  };
  const matrix = new Map();
  for (const stage of stages) {
    const row = {};
    for (const age of ageBuckets) row[age] = 0;
    matrix.set(stage, row);
  }
  for (const lead of leads) {
    const stage = lead.status || 'Неизвестно';
    if (!matrix.has(stage)) continue;
    const bucket = classify(Number(lead.daysSinceUpdate || 0));
    matrix.get(stage)[bucket] += 1;
  }
  return [...matrix.entries()].map(([stage, row]) => ({
    id: stage,
    data: ageBuckets.map((age) => ({ x: age, y: row[age] })),
  }));
}
