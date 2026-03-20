'use client';
import { useState, useEffect } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { motion } from 'framer-motion';

export default function CrmTimeline({ trackerConnected = false }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="bg-craft-surface border border-craft-border rounded-2xl overflow-hidden hover:border-craft-border2 transition-colors">
      <div className="px-5 py-3.5 border-b border-craft-border">
        <h2 className="text-[13px] font-display font-medium tracking-tight">CRM — Лента событий</h2>
      </div>

      <div className="px-4 pt-3 pb-1 border-b border-craft-border/70">
        <div className="text-2xs text-white/25 mb-1.5">Temporal Pulse (активность по дням)</div>
        <div className="h-32 bg-craft-bg/35 rounded-lg border border-white/[0.05] overflow-hidden">
          <ResponsiveLine
            data={[
              {
                id: 'pulse',
                data: pulseSeries.map((p) => ({ x: p.label, y: p.value })),
              },
            ]}
            margin={{ top: 12, right: 12, bottom: 28, left: 24 }}
            xScale={{ type: 'point' }}
            yScale={{ type: 'linear', min: 0, max: 'auto' }}
            colors={['#6DD8E0']}
            lineWidth={2}
            pointSize={7}
            pointColor="#6DD8E0"
            pointBorderWidth={1}
            pointBorderColor="#161616"
            useMesh
            enableGridX={false}
            gridYValues={4}
            axisTop={null}
            axisRight={null}
            axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: 0, legend: '', legendOffset: 0, legendPosition: 'middle' }}
            axisLeft={{ tickSize: 0, tickPadding: 6, tickRotation: 0, legend: '', legendOffset: 0, legendPosition: 'middle' }}
            enableSlices={false}
            curve="monotoneX"
            enableArea
            areaOpacity={0.16}
            theme={{
              axis: { ticks: { text: { fill: 'rgba(255,255,255,0.28)', fontSize: 10 } } },
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
