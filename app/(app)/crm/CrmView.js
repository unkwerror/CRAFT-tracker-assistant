'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import MiniFunnel from '@/components/crm/MiniFunnel';
import CrmKanban from '@/components/dashboard/CrmKanban';
import CrmTimeline from '@/components/dashboard/CrmTimeline';
import FunnelChart from '@/components/dashboard/FunnelChart';

const VIEWS = [
  { id: 'kanban', label: 'Канбан', icon: '▦' },
  { id: 'timeline', label: 'Лента', icon: '≡' },
  { id: 'funnel', label: 'Воронка', icon: '▽' },
];

export default function CrmView({ trackerConnected }) {
  const [view, setView] = useState('kanban');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-semibold">CRM</h1>
          <div className="text-2xs text-craft-muted">Воронка, история касаний и статус сделок в одном месте</div>
        </div>
      </div>

      {view !== 'funnel' && <MiniFunnel trackerConnected={trackerConnected} />}

      <div className="flex gap-1 bg-craft-surface rounded-lg p-0.5 w-fit">
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors relative ${
              view === v.id ? 'text-white' : 'text-craft-muted hover:text-white/70'
            }`}
          >
            {view === v.id && (
              <motion.div
                layoutId="crm-view-indicator"
                className="absolute inset-0 bg-craft-accent/15 rounded-md"
              />
            )}
            <span className="relative">{v.icon} {v.label}</span>
          </button>
        ))}
      </div>

      {view === 'kanban' && (
        <CrmKanban trackerConnected={trackerConnected} />
      )}
      {view === 'timeline' && (
        <div className="bg-craft-surface/60 rounded-xl p-4">
          <CrmTimeline trackerConnected={trackerConnected} />
        </div>
      )}
      {view === 'funnel' && (
        <div className="bg-craft-surface/60 rounded-xl p-4 h-[500px]">
          <FunnelChart trackerConnected={trackerConnected} />
        </div>
      )}
    </div>
  );
}
