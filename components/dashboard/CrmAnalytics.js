'use client';
import { useState, useEffect } from 'react';

const TABS = [
  { key: 'scoring', label: 'Скоринг' },
  { key: 'forecast', label: 'Прогноз выручки' },
  { key: 'velocity', label: 'Velocity' },
  { key: 'anomalies', label: 'Аномалии' },
];

export default function CrmAnalytics({ trackerConnected = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('scoring');

  useEffect(() => {
    if (!trackerConnected) { setLoading(false); return; }

    fetch('/api/analytics/crm')
      .then(r => r.json())
      .then(d => setData(d.analytics || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [trackerConnected]);

  if (!trackerConnected) {
    return (
      <div className="bg-craft-surface border border-craft-border rounded-2xl p-8 text-center">
        <div className="text-white/20 text-sm">Подключите Трекер для аналитики</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-craft-surface border border-craft-border rounded-2xl p-10 flex justify-center">
        <div className="w-6 h-6 border-2 border-white/5 border-t-craft-purple/50 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.empty) {
    return (
      <div className="bg-craft-surface border border-craft-border rounded-2xl p-8 text-center">
        <div className="text-white/20 text-sm">Недостаточно данных для аналитики</div>
        <div className="text-2xs text-white/10 mt-1">Добавьте лиды в CRM-очередь</div>
      </div>
    );
  }

  return (
    <div className="bg-craft-surface border border-craft-border rounded-2xl overflow-hidden hover:border-craft-border2 transition-colors">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-craft-border">
        <h2 className="text-[13px] font-display font-medium tracking-tight">CRM Аналитика</h2>
        <div className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-[10px] px-2.5 py-1 rounded-md transition-colors ${
                tab === t.key
                  ? 'bg-craft-accent/15 text-craft-accent'
                  : 'text-white/25 hover:text-white/40 hover:bg-white/[0.04]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {tab === 'scoring' && <ScoringTab scores={data.scores} />}
        {tab === 'forecast' && <ForecastTab forecast={data.forecast} />}
        {tab === 'velocity' && <VelocityTab velocity={data.velocity} />}
        {tab === 'anomalies' && <AnomaliesTab anomalies={data.anomalies} />}
      </div>
    </div>
  );
}

function ScoringTab({ scores }) {
  if (!scores || scores.length === 0) return <Empty text="Нет данных для скоринга" />;
  const top = scores.slice(0, 15);

  return (
    <div className="space-y-2">
      <div className="text-2xs text-white/25 mb-3">Топ лиды по скорингу (0–100)</div>
      {top.map(s => (
        <div key={s.key} className="flex items-center gap-3 group">
          <div className="w-10 text-right">
            <span className={`text-sm font-display font-medium ${
              s.score >= 70 ? 'text-craft-green' : s.score >= 40 ? 'text-craft-orange' : 'text-craft-red'
            }`}>{s.score}</span>
          </div>
          <div className="flex-1">
            <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${s.score}%`,
                  background: s.score >= 70 ? '#42C774' : s.score >= 40 ? '#FFB155' : '#FF7B72',
                }}
              />
            </div>
          </div>
          <div className="w-48 truncate text-2xs text-white/40 group-hover:text-white/60 transition-colors">
            <span className="text-white/20 font-mono mr-1.5">{s.key}</span>{s.summary}
          </div>
        </div>
      ))}
    </div>
  );
}

function ForecastTab({ forecast }) {
  if (!forecast || forecast.totalRaw === 0) return <Empty text="Нет данных о бюджетах" />;

  const fmtMoney = (n) => {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)} млн`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(0)} тыс`;
    return String(n);
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white/[0.03] rounded-xl p-4">
          <div className="text-2xs text-white/25 mb-1">Общий pipeline</div>
          <div className="text-xl font-display text-white/70">{fmtMoney(forecast.totalRaw)} ₽</div>
        </div>
        <div className="bg-white/[0.03] rounded-xl p-4">
          <div className="text-2xs text-white/25 mb-1">Взвешенный прогноз</div>
          <div className="text-xl font-display text-craft-green">{fmtMoney(forecast.totalWeighted)} ₽</div>
        </div>
      </div>
      <div className="space-y-2">
        {forecast.byStage.map(s => (
          <div key={s.stage} className="flex items-center justify-between text-2xs">
            <div className="flex items-center gap-2">
              <span className="text-white/40">{s.label}</span>
              <span className="text-white/15">({s.count})</span>
              <span className="text-white/10">×{Math.round(s.weight * 100)}%</span>
            </div>
            <div className="flex gap-4">
              <span className="text-white/30 tabular-nums">{fmtMoney(s.raw)} ₽</span>
              <span className="text-craft-green/70 tabular-nums">{fmtMoney(Math.round(s.weighted))} ₽</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VelocityTab({ velocity }) {
  if (!velocity || velocity.length === 0) return <Empty text="Недостаточно данных" />;
  const maxMedian = Math.max(...velocity.map(v => v.median || 0), 1);

  return (
    <div className="space-y-3">
      <div className="text-2xs text-white/25 mb-1">Медиана дней в каждом статусе</div>
      {velocity.map(v => (
        <div key={v.stage}>
          <div className="flex justify-between text-2xs mb-1">
            <span className="text-white/40">{v.label}</span>
            <span className="text-white/60 tabular-nums">{v.median ?? '—'} дн <span className="text-white/20">(avg {v.avg ?? '—'})</span></span>
          </div>
          <div className="h-3 bg-white/[0.03] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-craft-purple/40 transition-all duration-500"
              style={{ width: `${v.median ? (v.median / maxMedian) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AnomaliesTab({ anomalies }) {
  if (!anomalies || anomalies.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="text-craft-green text-sm mb-1">Аномалий нет</div>
        <div className="text-2xs text-white/20">Все лиды обновляются в нормальном режиме</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-2xs text-white/25 mb-3">Застрявшие лиды (Z-score &gt; 1.5)</div>
      {anomalies.map(a => (
        <div key={a.key} className="flex items-center gap-3 bg-craft-red/5 border border-craft-red/10 rounded-lg p-3">
          <div className="text-sm font-display text-craft-red font-medium w-10 text-center">
            {a.zScore.toFixed(1)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-2xs text-white/60 truncate">{a.summary}</div>
            <div className="text-2xs text-white/25">{a.key} • {a.status} • {a.daysSinceUpdate}д без обновлений</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({ text }) {
  return <div className="text-center py-6 text-2xs text-white/20">{text}</div>;
}
