'use client';
import { useState, useEffect, useCallback } from 'react';

async function readTrackerJson(r) {
  let data = {};
  try {
    data = await r.json();
  } catch {
    /* non-JSON */
  }
  if (!r.ok) {
    throw new Error(
      data.error || (r.status === 503 ? 'Трекер не подключён' : `Ошибка ${r.status}`)
    );
  }
  return data;
}

const AUDIT_TABS = [
  { id: 'no_deadline', label: 'Без дедлайна' },
  { id: 'stale', label: 'Зависшие' },
  { id: 'overdue', label: 'Просроченные' },
];

export default function AuditWidget({ trackerConnected = false }) {
  const [tab, setTab] = useState('no_deadline');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAudit = useCallback(() => {
    if (!trackerConnected) {
      setData({ no_deadline: [], stale: [], overdue: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all(
      AUDIT_TABS.map((t) =>
        fetch(`/api/tracker/tasks?type=${t.id}`)
          .then(readTrackerJson)
          .then((d) => ({ [t.id]: d.tasks || [] }))
      )
    )
      .then((results) => {
        setData(Object.assign({}, ...results));
      })
      .catch((e) => {
        setError(e.message);
        setData({ no_deadline: [], stale: [], overdue: [] });
      })
      .finally(() => setLoading(false));
  }, [trackerConnected]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const items = data[tab] || [];
  const counts = {
    no_deadline: (data.no_deadline || []).length,
    stale: (data.stale || []).length,
    overdue: (data.overdue || []).length,
  };
  const totalIssues = counts.no_deadline + counts.stale + counts.overdue;

  return (
    <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden transition-colors duration-200 hover:border-craft-border2">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-craft-border">
        <h2 className="text-[13px] font-display font-medium tracking-tight">Аудит качества</h2>
        {totalIssues > 0 && (
          <span className="text-2xs text-white/25">{totalIssues} проблем</span>
        )}
      </div>

      {!trackerConnected ? (
        <div className="px-5 py-8 text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-white/[0.03] flex items-center justify-center">
            <svg className="w-5 h-5 text-white/10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2">
              <circle cx="10" cy="10" r="7" />
              <path d="M10 7v3M10 13h.01" />
            </svg>
          </div>
          <div className="text-[13px] text-white/25 mb-1">Трекер не подключён</div>
          <div className="text-2xs text-white/15">Аудит задач станет доступен после подключения Трекера</div>
        </div>
      ) : error ? (
        <div className="px-5 py-8 text-center">
          <div className="text-craft-red/60 mb-2">Ошибка загрузки</div>
          <div className="text-2xs text-white/15 mb-3">{error}</div>
          <button
            type="button"
            onClick={() => loadAudit()}
            className="text-craft-accent/70 hover:text-craft-accent text-2xs"
          >
            Повторить
          </button>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-0.5 px-4 pt-3 pb-1">
            {AUDIT_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`text-2xs px-3 py-1.5 rounded-md transition-all duration-200 flex items-center gap-1.5
                  ${tab === t.id ? 'bg-white/[0.06] text-white/80' : 'text-white/30 hover:text-white/50 hover:bg-white/[0.02]'}`}
              >
                {t.label}
                {counts[t.id] > 0 && (
                  <span className={`text-2xs min-w-[16px] h-4 flex items-center justify-center rounded-full px-1
                    ${t.id === 'overdue' ? 'bg-craft-red/15 text-craft-red' :
                      t.id === 'stale' ? 'bg-craft-orange/15 text-craft-orange' :
                      'bg-white/[0.08] text-white/40'}`}>
                    {counts[t.id]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <div className="px-5 py-6 flex justify-center">
              <div className="w-5 h-5 border-2 border-white/5 border-t-white/20 rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <div className="text-[13px] text-craft-green/50">Проблем не найдено</div>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {items.map((item, i) => (
                <div key={item.key || i} className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/[0.02] transition-all duration-200">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-2xs font-mono text-white/20">{item.key}</span>
                      {item.assignee && <span className="text-2xs text-white/15">/ {item.assignee}</span>}
                    </div>
                    <div className="text-[12px] text-white/50 truncate">{item.summary}</div>
                  </div>
                  {item.days !== null && item.days !== undefined && (
                    <span className={`text-2xs shrink-0 ${
                      item.days > 14 ? 'text-craft-red' : item.days > 7 ? 'text-craft-orange' : 'text-white/30'
                    }`}>
                      {item.days}д
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
