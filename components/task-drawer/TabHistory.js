'use client';
import { fmtDate } from './utils';

export default function TabHistory({ history, loading }) {
  if (loading) return <div className="text-2xs text-white/25">Загрузка истории...</div>;
  if (!history || history.length === 0) return <div className="text-2xs text-white/20">Нет данных истории</div>;

  return (
    <div className="space-y-2 overflow-y-auto pr-1">
      {history.map((h, i) => {
        const from = h.fromDisplay || h.from?.display || h.from?.key || h.from || '—';
        const to   = h.toDisplay   || h.to?.display   || h.to?.key   || h.to   || '—';
        const who  = typeof h.updatedBy === 'string' && h.updatedBy.trim()
          ? h.updatedBy
          : h.updatedBy?.display || h.createdBy?.display || h.author?.display || 'Система';
        const ts = h.updatedAt || h.createdAt;

        return (
          <div
            key={h.id || `${ts || 'ts'}-${i}`}
            className="bg-white/[0.03] border border-white/[0.05] rounded-lg p-2.5"
          >
            {(h.fieldDisplay || h.field) && (
              <div className="text-2xs text-white/35 mb-0.5">{h.fieldDisplay || h.field}</div>
            )}
            <div className="text-2xs text-white/65">{from} → {to}</div>
            <div className="text-2xs text-white/25 mt-1">{fmtDate(ts)} • {who}</div>
          </div>
        );
      })}
    </div>
  );
}
