'use client';
import { useState, useEffect, useRef } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { motion } from 'framer-motion';
import WidgetDebugBadge from './WidgetDebugBadge';

export default function CrmTimeline({ trackerConnected = false }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const chartWrapRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    if (!trackerConnected) { setLoading(false); return; }

    fetch('/api/tracker/queues/CRM')
      .then(r => r.json())
      .then(d => {
        const tasks = d.tasks || [];
        const sorted = tasks
          .filter(t => t.updatedAt)
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          .slice(0, 20);
        setEvents(sorted);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [trackerConnected]);

  useEffect(() => {
    if (!chartWrapRef.current || typeof ResizeObserver === 'undefined') return;
    const node = chartWrapRef.current;
    const observer = new ResizeObserver((entries) => {
      const w = entries?.[0]?.contentRect?.width || 0;
      setChartWidth(Math.round(w));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

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
        <div className="w-5 h-5 border-2 border-white/5 border-t-craft-cyan/40 rounded-full animate-spin" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-craft-surface border border-craft-border rounded-2xl p-6 text-center">
        <div className="text-white/20 text-2xs">Нет событий CRM</div>
      </div>
    );
  }

  const pulseSeries = buildPulseSeries(events, 14);
  const yMax = Math.max(...pulseSeries.map((p) => Number(p.value || 0)), 1);
  const yTicks = buildYAxisTicks(yMax);
  const isCompact = chartWidth > 0 && chartWidth < 420;
  const xTickEvery = isCompact ? 3 : 2;
  const xTickValues = pulseSeries
    .filter((_, idx) => idx % xTickEvery === 0 || idx === pulseSeries.length - 1)
    .map((p) => p.label);
  const lineData = [
    {
      id: 'pulse',
      data: pulseSeries.map((p) => ({
        x: p.label,
        y: p.value,
      })),
    },
  ];

  return (
    <div className="bg-craft-surface border border-craft-border rounded-2xl overflow-hidden hover:border-craft-border2 transition-colors">
      <div className="px-5 py-3.5 border-b border-craft-border">
        <h2 className="text-[13px] font-display font-medium tracking-tight">CRM — Лента событий</h2>
      </div>

      <div className="px-4 pt-3 pb-1 border-b border-craft-border/70">
        <WidgetDebugBadge
          title="CRM Timeline"
          endpoint="/api/tracker/queues/CRM"
          metrics={{
            sourceTasks: events.length,
            pulseDays: pulseSeries.length,
            yMax,
            chartWidth,
          }}
          note="Temporal Pulse строится из updatedAt последних CRM задач"
        />
        <div className="text-2xs text-white/25 mb-1.5">Temporal Pulse (активность по дням)</div>
        <div ref={chartWrapRef} className="h-36 sm:h-40 bg-craft-bg/35 rounded-lg border border-white/[0.05] overflow-hidden">
          <ResponsiveLine
            data={lineData}
            margin={{ top: 14, right: 14, bottom: 32, left: isCompact ? 34 : 44 }}
            xScale={{ type: 'point' }}
            yScale={{ type: 'linear', min: 0, max: yMax }}
            colors={['#6DD8E0']}
            lineWidth={2}
            pointSize={isCompact ? 5 : 6}
            pointColor="#6DD8E0"
            pointBorderWidth={1}
            pointBorderColor="#161616"
            useMesh
            enableGridX={false}
            gridYValues={yTicks}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 0,
              tickPadding: 8,
              tickRotation: 0,
              tickValues: xTickValues,
              format: (v) => String(v),
            }}
            axisLeft={{
              tickSize: 0,
              tickPadding: 6,
              tickRotation: 0,
              tickValues: yTicks,
              format: (v) => `${v}`,
            }}
            enableSlices={false}
            curve="monotoneX"
            enableArea
            areaOpacity={0.18}
            theme={{
              axis: { ticks: { text: { fill: 'rgba(255,255,255,0.32)', fontSize: isCompact ? 9 : 10 } } },
              grid: { line: { stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 } },
              crosshair: { line: { stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 } },
              tooltip: { container: { background: '#151515', color: '#ddd', fontSize: 11, border: '1px solid #2a2a2a' } },
            }}
            tooltip={({ point }) => (
              <div className="px-2 py-1 rounded bg-craft-surface border border-craft-border text-2xs text-white/70">
                {point.data.xFormatted}: {point.data.yFormatted} событий
              </div>
            )}
          />
        </div>
      </div>

      <div className="px-5 py-3 max-h-[360px] overflow-y-auto space-y-0">
        {events.map((ev, i) => {
          const date = new Date(ev.updatedAt);
          const ago = formatAgo(date);

          return (
            <motion.div
              key={ev.key}
              className="flex gap-3 group"
              initial={{ opacity: 0.55, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: i * 0.015 }}
            >
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-craft-accent/40 mt-2 group-hover:bg-craft-accent transition-colors relative">
                  <span className="absolute inset-0 rounded-full bg-craft-accent/30 animate-ping" />
                </div>
                {i < events.length - 1 && <div className="w-px flex-1 bg-white/[0.06]" />}
              </div>
              <div className="pb-3 min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xs font-mono text-white/20">{ev.key}</span>
                  <span className="text-2xs text-white/15">{ago}</span>
                </div>
                <div className="text-[12px] text-white/60 truncate group-hover:text-white/80 transition-colors">{ev.summary}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-2xs text-white/25">{ev.status}</span>
                  {ev.assignee && <span className="text-2xs text-white/15">• {ev.assignee}</span>}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function formatAgo(date) {
  const diff = Math.round((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн назад`;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function buildPulseSeries(events, days = 14) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const map = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, 0);
  }
  for (const ev of events) {
    if (!ev.updatedAt) continue;
    const d = new Date(ev.updatedAt);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, map.get(key) + 1);
  }
  return [...map.entries()].map(([key, value]) => {
    const d = new Date(key);
    return { key, value, label: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) };
  });
}

function buildYAxisTicks(maxValue) {
  const max = Math.max(1, Math.ceil(maxValue));
  const targetSteps = max <= 4 ? max : 4;
  const step = Math.max(1, Math.ceil(max / targetSteps));
  const out = [0];
  for (let v = step; v <= max; v += step) out.push(v);
  if (out[out.length - 1] !== max) out.push(max);
  return out;
}
