'use client';

import { useEffect, useMemo, useState } from 'react';

export default function WidgetDebugBadge({ title, endpoint, metrics = {}, note = '' }) {
  const [enabledByQuery, setEnabledByQuery] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const queryEnabled = params.get('debugWidgets') === '1';
    const stickyEnabled = window.localStorage.getItem('debugWidgets') === '1';
    if (queryEnabled) window.localStorage.setItem('debugWidgets', '1');
    setEnabledByQuery(queryEnabled || stickyEnabled);
  }, []);

  const isEnabled = process.env.NEXT_PUBLIC_DEBUG_WIDGETS === '1' || enabledByQuery;
  const metricRows = useMemo(
    () => Object.entries(metrics).filter(([, v]) => v !== undefined && v !== null),
    [metrics]
  );

  if (!isEnabled) return null;

  return (
    <div className="mb-2 rounded-lg border border-craft-accent/25 bg-craft-accent/[0.07] px-2.5 py-2 text-[10px] leading-4 text-white/70">
      <div className="font-medium text-craft-accent/80 tracking-[0.08em] uppercase mb-1">{title} debug</div>
      <div className="text-white/35 break-all">{endpoint}</div>
      {metricRows.length > 0 && (
        <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5">
          {metricRows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-2">
              <span className="text-white/35">{k}</span>
              <span className="text-white/75 tabular-nums">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
      {note ? <div className="mt-1 text-white/40">{note}</div> : null}
    </div>
  );
}
