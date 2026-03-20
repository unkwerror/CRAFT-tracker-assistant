'use client';
import { useState, useEffect } from 'react';

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
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
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
      )}
    </div>
  );
}
