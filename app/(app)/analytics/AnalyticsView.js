'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ConversionSection from '@/components/analytics/ConversionSection';
import ScoringSection from '@/components/analytics/ScoringSection';
import ForecastSection from '@/components/analytics/ForecastSection';
import ManagersSection from '@/components/analytics/ManagersSection';
import TrendsSection from '@/components/analytics/TrendsSection';

const SECTIONS = [
  { id: 'conversion', label: 'Воронка', icon: '▽' },
  { id: 'scoring',    label: 'Скоринг', icon: '★' },
  { id: 'forecast',   label: 'Прогноз', icon: '◈' },
  { id: 'managers',   label: 'Команда', icon: '◉' },
  { id: 'trends',     label: 'Тренды',  icon: '∿' },
];

const PERIODS = [
  { id: 'month',   label: 'Месяц' },
  { id: 'quarter', label: 'Квартал' },
];

function SectionSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="bg-craft-surface border border-craft-border rounded-xl p-5">
          <div className="h-3 bg-craft-surface2 rounded w-1/4 mb-4" />
          <div className="h-52 bg-craft-surface2 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsView({ trackerConnected }) {
  const [section, setSection] = useState('conversion');
  const [period, setPeriod] = useState('month');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);

  const load = useCallback(() => {
    if (!trackerConnected) return;
    setLoading(true);
    setError(null);
    const q = new URLSearchParams({ ml: 'true', changelog: 'true', cohort: period });
    fetch(`/api/analytics/crm?${q}`)
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(json.error || `Ошибка ${r.status}`);
        return json;
      })
      .then((d) => {
        setAnalytics(d.analytics || null);
        setFetchedAt(new Date());
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [trackerConnected, period]);

  useEffect(() => { load(); }, [load]);

  function formatAgo(date) {
    if (!date) return null;
    const diff = Math.round((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    return `${Math.floor(diff / 3600)} ч назад`;
  }

  const isEmpty = !loading && !error && analytics?.empty;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-semibold">Аналитика</h1>
          {fetchedAt && !loading && (
            <p className="text-xs text-craft-muted mt-0.5">
              Обновлено {formatAgo(fetchedAt)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <div className="flex gap-0.5 bg-craft-surface border border-craft-border rounded-lg p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  period === p.id
                    ? 'bg-craft-accent/15 text-craft-accent'
                    : 'text-craft-muted hover:text-white/70'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-craft-surface border border-craft-border text-xs text-craft-muted hover:text-white/70 transition-colors disabled:opacity-40"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 8A6 6 0 1 1 8 2a6 6 0 0 1 4.24 1.76L14 2v4h-4l1.76-1.76" />
            </svg>
            Обновить
          </button>

          {/* Export */}
          <a
            href="/api/export/crm"
            target="_blank"
            className="px-3 py-1.5 rounded-lg bg-craft-surface border border-craft-border text-xs text-craft-muted hover:text-white/70 transition-colors"
          >
            Экспорт CSV
          </a>
        </div>
      </div>

      {/* Not connected */}
      {!trackerConnected && (
        <div className="bg-craft-surface border border-craft-border rounded-xl p-12 text-center">
          <div className="text-craft-muted text-sm mb-1">Трекер не подключён</div>
          <div className="text-xs text-craft-muted/60">Настройте TRACKER_ORG_ID для доступа к аналитике</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-craft-red/5 border border-craft-red/20 rounded-xl p-5 flex items-center justify-between">
          <div>
            <div className="text-sm text-craft-red font-medium mb-0.5">Ошибка загрузки</div>
            <div className="text-xs text-craft-muted">{error}</div>
          </div>
          <button onClick={load} className="text-xs text-craft-accent hover:underline">Повторить</button>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="bg-craft-surface border border-craft-border rounded-xl p-12 text-center">
          <div className="text-craft-muted text-sm mb-1">Недостаточно данных</div>
          <div className="text-xs text-craft-muted/60">Добавьте лиды в CRM-очередь для отображения аналитики</div>
        </div>
      )}

      {/* Main content */}
      {trackerConnected && !isEmpty && (
        <div className="flex flex-col md:flex-row gap-5">
          {/* Sidebar nav */}
          <nav className="md:w-44 shrink-0">
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap md:whitespace-normal w-full text-left ${
                    section === s.id
                      ? 'bg-craft-accent/15 text-craft-accent'
                      : 'text-craft-muted hover:text-white/70 hover:bg-craft-surface'
                  }`}
                >
                  <span className="opacity-60 text-base leading-none">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Section content */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                {loading ? (
                  <SectionSkeleton />
                ) : (
                  <>
                    {section === 'conversion' && (
                      <ConversionSection analytics={analytics} loading={loading} />
                    )}
                    {section === 'scoring' && (
                      <ScoringSection analytics={analytics} loading={loading} />
                    )}
                    {section === 'forecast' && (
                      <ForecastSection analytics={analytics} loading={loading} />
                    )}
                    {section === 'managers' && (
                      <ManagersSection analytics={analytics} loading={loading} />
                    )}
                    {section === 'trends' && (
                      <TrendsSection analytics={analytics} loading={loading} />
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Footer */}
      {analytics && !analytics.empty && (
        <div className="flex items-center justify-between border-t border-craft-border pt-4 text-xs text-craft-muted">
          <span>
            {/* leadsCount comes from route wrapper */}
            Данные актуальны на момент последнего обновления
          </span>
          <span>
            {period === 'month' ? 'Когорты: по месяцам' : 'Когорты: по кварталам'}
          </span>
        </div>
      )}
    </div>
  );
}
