'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import WidgetDebugBadge from './WidgetDebugBadge';

const FUNNEL_STAGES = [
  { key: 'newLead',       label: 'Новый лид',     color: '#5BA4F5' },
  { key: 'qualification', label: 'Квалификация',   color: '#C9A0FF' },
  { key: 'proposal',      label: 'КП отправлено',  color: '#FFB155' },
  { key: 'negotiation',   label: 'Переговоры',     color: '#FF9F43' },
  { key: 'contract',      label: 'Договор',        color: '#42C774' },
  { key: 'projectOpened', label: 'Проект открыт',  color: '#2ECC71' },
];

const STATUS_MAP = {
  'Новый лид': 'newLead',
  'Квалификация': 'qualification',
  'КП отправлено': 'proposal',
  'Переговоры': 'negotiation',
  'Договор': 'contract',
  'Проект открыт': 'projectOpened',
};

export default function FunnelChart({ trackerConnected = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showS2S, setShowS2S] = useState(false);

  useEffect(() => {
    if (!trackerConnected) { setLoading(false); return; }

    fetch('/api/tracker/queues/CRM')
      .then(r => r.json())
      .then(d => {
        const tasks = d.tasks || [];
        const byStage = {};
        let total = 0;
        for (const t of tasks) {
          const sk = STATUS_MAP[t.status] || t.statusKey || 'unknown';
          if (FUNNEL_STAGES.find(s => s.key === sk)) {
            byStage[sk] = (byStage[sk] || 0) + 1;
            total++;
          }
        }
        const postponed = tasks.filter(t => (STATUS_MAP[t.status] || t.statusKey) === 'postponed').length;
        const rejected = tasks.filter(t => (STATUS_MAP[t.status] || t.statusKey) === 'rejected').length;
        setData({ byStage, total, postponed, rejected, allCount: tasks.length });
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [trackerConnected]);

  if (!trackerConnected || (!loading && !data)) {
    return (
      <div className="bg-craft-surface border border-craft-border rounded-2xl p-5">
        <h2 className="text-[13px] font-display font-medium tracking-tight mb-4">Воронка CRM</h2>
        <div className="py-8 text-center text-[12px] text-white/20">
          {!trackerConnected ? 'Подключите Трекер' : 'Нет данных'}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-craft-surface border border-craft-border rounded-2xl p-5">
        <h2 className="text-[13px] font-display font-medium tracking-tight mb-4">Воронка CRM</h2>
        <div className="flex justify-center py-8">
          <motion.div
            className="w-5 h-5 border-2 border-white/5 border-t-craft-cyan/40 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
          />
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...FUNNEL_STAGES.map(s => data.byStage[s.key] || 0), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
      className="bg-craft-surface border border-craft-border rounded-2xl overflow-hidden hover:border-craft-border2 transition-colors duration-200"
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-craft-border">
        <h2 className="text-[13px] font-display font-medium tracking-tight">Воронка CRM</h2>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => setShowS2S(v => !v)}
            whileTap={{ scale: 0.97 }}
            className={`text-[10px] transition-colors ${showS2S ? 'text-craft-accent' : 'text-white/20 hover:text-white/40'}`}
          >
            {showS2S ? 'Общая' : 'Stage→Stage'}
          </motion.button>
          <span className="text-[10px] text-white/20 tabular-nums">{data.allCount} всего</span>
        </div>
      </div>
      <div className="px-4 pt-3">
        <WidgetDebugBadge
          title="CRM Funnel"
          endpoint="/api/tracker/queues/CRM"
          metrics={{
            allCount: data?.allCount || 0,
            mappedCount: data?.total || 0,
            postponed: data?.postponed || 0,
            rejected: data?.rejected || 0,
          }}
        />
      </div>

      <div className="h-28 border-b border-craft-border/70 bg-craft-bg/30">
        <Canvas orthographic camera={{ position: [0, 0, 100], zoom: 70 }}>
          <color attach="background" args={['#101114']} />
          <ambientLight intensity={0.35} />
          <LivingFunnelNodes counts={FUNNEL_STAGES.map((s) => data.byStage[s.key] || 0)} />
          <LivingParticleFlow />
        </Canvas>
      </div>

      <div className="px-5 py-4 space-y-2.5">
        {FUNNEL_STAGES.map((stage, i) => {
          const count = data.byStage[stage.key] || 0;
          const widthPct = maxCount > 0 ? Math.max((count / maxCount) * 100, 4) : 4;

          let convLabel;
          if (showS2S && i > 0) {
            const prevCount = data.byStage[FUNNEL_STAGES[i - 1].key] || 0;
            convLabel = prevCount > 0 ? `${Math.round((count / prevCount) * 100)}%` : '—';
          } else {
            convLabel = data.total > 0 ? `${Math.round((count / data.total) * 100)}%` : '0%';
          }

          return (
            <div key={stage.key} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-white/40 group-hover:text-white/60 transition-colors">{stage.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium tabular-nums" style={{ color: stage.color }}>{count}</span>
                  <span className="text-[10px] text-white/15 tabular-nums w-8 text-right">{convLabel}</span>
                </div>
              </div>
              <div className="h-5 bg-white/[0.02] rounded-lg overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${widthPct}%` }}
                  viewport={{ once: true, amount: 0.8 }}
                  transition={{ duration: 0.65, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-lg"
                  style={{
                    background: `linear-gradient(90deg, ${stage.color}30, ${stage.color}50)`,
                  }}
                />
              </div>
              {showS2S && i > 0 && (
                <div className="flex justify-center -my-0.5">
                  <svg className="w-3 h-3 text-white/10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M6 2v8M3 7l3 3 3-3" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(data.postponed > 0 || data.rejected > 0) && (
        <div className="px-5 py-3 border-t border-craft-border flex gap-4">
          {data.postponed > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#7A8899]" />
              <span className="text-[10px] text-white/25">Отложено: {data.postponed}</span>
            </div>
          )}
          {data.rejected > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-craft-red" />
              <span className="text-[10px] text-white/25">Отказ: {data.rejected}</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function LivingFunnelNodes({ counts }) {
  const group = useRef();
  const max = Math.max(...counts, 1);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (group.current) {
      group.current.children.forEach((child, i) => {
        const pulse = 1 + Math.sin(t * 1.4 + i * 0.35) * 0.06;
        child.scale.setScalar(pulse);
      });
    }
  });

  return (
    <group ref={group}>
      {counts.map((count, i) => {
        const x = -2.7 + i * 1.1;
        const ratio = count / max;
        const y = -0.6 + ratio * 1.3;
        const size = 0.08 + ratio * 0.13;
        return (
          <mesh key={i} position={[x, y, 0]}>
            <circleGeometry args={[size, 24]} />
            <meshBasicMaterial color={ratio > 0.6 ? '#42C774' : ratio > 0.3 ? '#5BA4F5' : '#7A8899'} transparent opacity={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

function LivingParticleFlow() {
  const points = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        x: -3.1 + Math.random() * 6.2,
        y: -1.4 + Math.random() * 2.6,
        speed: 0.25 + Math.random() * 0.7,
        drift: (Math.random() - 0.5) * 0.3,
        size: 0.018 + Math.random() * 0.028,
        phase: i * 0.17,
      })),
    []
  );
  const group = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!group.current) return;
    group.current.children.forEach((mesh, i) => {
      const p = points[i];
      let nx = p.x + ((t * p.speed + p.phase) % 6.6);
      if (nx > 3.2) nx -= 6.6;
      mesh.position.x = nx;
      mesh.position.y = p.y + Math.sin(t * 1.4 + p.phase) * 0.08 + p.drift;
      const alpha = 0.25 + (Math.sin(t * 2 + p.phase) + 1) * 0.25;
      mesh.material.opacity = alpha;
    });
  });

  return (
    <group ref={group}>
      {points.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, 0]}>
          <circleGeometry args={[p.size, 12]} />
          <meshBasicMaterial color="#6DD8E0" transparent opacity={0.35} />
        </mesh>
      ))}
    </group>
  );
}
