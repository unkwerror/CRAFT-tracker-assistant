'use client';
import CraftChart from '@/components/ui/CraftChart';

function SectionEmpty({ text = 'Недостаточно данных' }) {
  return (
    <div className="flex items-center justify-center h-40 text-xs text-craft-muted">{text}</div>
  );
}

function SectionSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-craft-surface2 rounded w-1/3" />
      <div className="h-48 bg-craft-surface2 rounded-lg" />
    </div>
  );
}

function scoreColor(score) {
  if (score >= 70) return 'text-craft-green';
  if (score >= 40) return 'text-craft-orange';
  return 'text-craft-red';
}

function buildHistogram(scores) {
  const buckets = [0, 0, 0, 0, 0];
  for (const s of scores) {
    const idx = Math.min(4, Math.floor(s.score / 20));
    buckets[idx]++;
  }
  return buckets;
}

function autoLabelSegment(seg, idx) {
  const budget = seg.avgBudget || 0;
  const age = seg.medianAge || 0;
  const [, , stagePct] = seg.centroid || [0, 0, 0];

  if (budget > 5_000_000 && age < 90) return `Крупные и свежие (${seg.count})`;
  if (budget > 5_000_000 && age >= 90) return `Крупные и долгие (${seg.count})`;
  if (budget <= 5_000_000 && age < 60) return `Мелкие и новые (${seg.count})`;
  if (stagePct > 0.6) return `Поздние стадии (${seg.count})`;
  return `Сегмент ${idx + 1} (${seg.count})`;
}

function fmtMoney(n) {
  const v = Number(n) || 0;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)} млрд`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)} млн`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)} тыс`;
  return `${Math.round(v)}`;
}

export default function ScoringSection({ analytics, loading }) {
  if (loading) return <SectionSkeleton />;

  const scores = analytics?.scores || [];
  const segments = analytics?.segments;
  const top10 = scores.slice(0, 10);

  const histBuckets = buildHistogram(scores);
  const histOption = {
    tooltip: { trigger: 'axis', formatter: (p) => `${p[0].axisValue}: ${p[0].value} лидов` },
    xAxis: { type: 'category', data: ['0–20', '20–40', '40–60', '60–80', '80–100'] },
    yAxis: { type: 'value', minInterval: 1 },
    grid: { left: 40, right: 16, top: 8, bottom: 32 },
    series: [
      {
        type: 'bar',
        name: 'Лидов',
        data: histBuckets.map((v, i) => ({
          value: v,
          itemStyle: { color: i >= 4 ? '#42C774' : i >= 2 ? '#FFB155' : '#FF7B72' },
        })),
        label: { show: true, position: 'top', fontSize: 11 },
      },
    ],
  };

  const scatterOption = scores.length === 0 ? null : {
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        const s = scores[p.dataIndex];
        return s ? `${s.key}: ${s.summary}<br/>Скоринг: ${s.score}` : '';
      },
    },
    xAxis: { type: 'value', name: 'Скоринг', nameLocation: 'middle', nameGap: 24, min: 0, max: 100 },
    yAxis: { type: 'category', data: top10.map((s) => s.key), axisLabel: { fontSize: 10 } },
    grid: { left: 72, right: 80, top: 8, bottom: 40 },
    series: [
      {
        type: 'bar',
        name: 'Скоринг',
        data: top10.map((s) => ({
          value: s.score,
          itemStyle: { color: s.score >= 70 ? '#42C774' : s.score >= 40 ? '#FFB155' : '#FF7B72' },
        })),
        itemStyle: { borderRadius: [0, 3, 3, 0] },
        label: { show: true, position: 'right', formatter: (p) => `${p.value}`, fontSize: 11 },
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution histogram */}
        <div className="bg-craft-surface border border-craft-border rounded-xl p-4">
          <h3 className="text-xs font-medium text-craft-muted mb-3">Распределение скоринга</h3>
          {scores.length === 0
            ? <SectionEmpty />
            : <CraftChart option={histOption} style={{ height: 200 }} />}
        </div>

        {/* Top-10 bar */}
        <div className="bg-craft-surface border border-craft-border rounded-xl p-4">
          <h3 className="text-xs font-medium text-craft-muted mb-3">Топ-10 лидов по скорингу</h3>
          {scatterOption
            ? <CraftChart option={scatterOption} style={{ height: 200 }} />
            : <SectionEmpty />}
        </div>
      </div>

      {/* Top-10 table */}
      {top10.length > 0 && (
        <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-craft-border">
            <h3 className="text-xs font-medium text-craft-muted">Детализация топ-10</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-craft-border">
                  <th className="text-left px-4 py-2.5 text-craft-muted font-medium">Лид</th>
                  <th className="text-right px-4 py-2.5 text-craft-muted font-medium">Балл</th>
                  <th className="text-right px-4 py-2.5 text-craft-muted font-medium">Бюджет</th>
                  <th className="text-right px-4 py-2.5 text-craft-muted font-medium">Источник</th>
                  <th className="text-right px-4 py-2.5 text-craft-muted font-medium">Возраст</th>
                  <th className="text-right px-4 py-2.5 text-craft-muted font-medium">Стадия</th>
                </tr>
              </thead>
              <tbody>
                {top10.map((s) => (
                  <tr key={s.key} className="border-b border-craft-border/50 hover:bg-craft-surface2/50">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-white/25 mr-1.5">{s.key}</span>
                      <span className="text-white/70">{s.summary}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`font-display font-medium ${scoreColor(s.score)}`}>{s.score}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-white/50">{s.breakdown?.budgetScore ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right text-white/50">{s.breakdown?.sourceScore ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right text-white/50">{s.breakdown?.ageScore ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right text-white/50">{s.breakdown?.stageScore ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* K-means segments */}
      {segments && !segments.tooFewLeads && (segments.segments || []).length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-craft-muted mb-3">Сегментация лидов (k-means)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(segments.segments || []).map((seg, idx) => (
              <div key={seg.id} className="bg-craft-surface border border-craft-border rounded-xl p-4">
                <div className="text-xs font-medium text-white/70 mb-3 leading-tight">
                  {autoLabelSegment(seg, idx)}
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-craft-muted">Ср. бюджет</span>
                    <span className="text-white/70">{fmtMoney(seg.avgBudget)} ₽</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-craft-muted">Медиана возраст</span>
                    <span className="text-white/70">{seg.medianAge ?? '—'} д</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-craft-muted">Лидов</span>
                    <span className="text-white/70">{seg.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
