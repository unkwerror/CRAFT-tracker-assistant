'use client';
import CraftChart from '@/components/ui/CraftChart';

function fmtPct(v) {
  if (v == null) return '—';
  return `${Math.round(v <= 1 ? v * 100 : v)}%`;
}

function SectionEmpty({ text = 'Недостаточно данных' }) {
  return (
    <div className="flex items-center justify-center h-40 text-xs text-craft-muted">
      {text}
    </div>
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

export default function ConversionSection({ analytics, loading }) {
  if (loading) return <SectionSkeleton />;

  const conversion = analytics?.conversion || [];
  const velocity = analytics?.velocityChangelog || analytics?.velocity || [];

  const funnelOption = {
    tooltip: { trigger: 'item', formatter: (p) => `${p.name}: ${p.value} лидов` },
    series: [
      {
        type: 'funnel',
        left: '5%',
        width: '90%',
        top: 8,
        bottom: 8,
        sort: 'descending',
        gap: 4,
        label: { show: true, position: 'inside', formatter: (p) => `${p.name}\n${p.value}` },
        emphasis: { label: { fontSize: 13 } },
        data: conversion.map((r) => ({
          name: r.fromLabel || r.from,
          value: r.fromCount,
        })).concat(
          conversion.length > 0
            ? [{ name: conversion[conversion.length - 1].toLabel, value: conversion[conversion.length - 1].toCount }]
            : []
        ),
      },
    ],
  };

  const convRateOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    yAxis: {
      type: 'category',
      data: conversion.map((r) => `${r.fromLabel} → ${r.toLabel}`),
      axisLabel: { width: 120, overflow: 'truncate', fontSize: 10 },
    },
    grid: { left: 130, right: 24, top: 8, bottom: 24 },
    series: [
      {
        type: 'bar',
        name: 'Конверсия',
        data: conversion.map((r) => Math.round((r.rate <= 1 ? r.rate * 100 : r.rate))),
        itemStyle: { borderRadius: [0, 3, 3, 0] },
        label: { show: true, position: 'right', formatter: (p) => `${p.value}%`, fontSize: 11 },
      },
    ],
  };

  const velocityOption = velocity.length === 0 ? null : {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Медиана', 'P90'], top: 4, right: 8 },
    xAxis: { type: 'value', axisLabel: { formatter: '{value}д' } },
    yAxis: {
      type: 'category',
      data: velocity.map((v) => v.label),
      axisLabel: { width: 100, overflow: 'truncate', fontSize: 10 },
    },
    grid: { left: 110, right: 24, top: 30, bottom: 24 },
    series: [
      {
        name: 'Медиана',
        type: 'bar',
        data: velocity.map((v) => v.median ?? 0),
        itemStyle: { borderRadius: [0, 3, 3, 0] },
      },
      {
        name: 'P90',
        type: 'bar',
        data: velocity.map((v) => v.p90 ?? 0),
        itemStyle: { borderRadius: [0, 3, 3, 0] },
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel */}
        <div className="bg-craft-surface border border-craft-border rounded-xl p-4">
          <h3 className="text-xs font-medium text-craft-muted mb-3">Воронка (количество лидов)</h3>
          {conversion.length === 0
            ? <SectionEmpty />
            : <CraftChart option={funnelOption} style={{ height: 240 }} />}
        </div>

        {/* Conversion rates */}
        <div className="bg-craft-surface border border-craft-border rounded-xl p-4">
          <h3 className="text-xs font-medium text-craft-muted mb-3">Конверсия между стадиями</h3>
          {conversion.length === 0
            ? <SectionEmpty />
            : <CraftChart option={convRateOption} style={{ height: 240 }} />}
        </div>
      </div>

      {/* Velocity */}
      <div className="bg-craft-surface border border-craft-border rounded-xl p-4">
        <h3 className="text-xs font-medium text-craft-muted mb-3">Время на стадии (дней)</h3>
        {velocityOption
          ? <CraftChart option={velocityOption} style={{ height: 200 }} />
          : <SectionEmpty text="Недостаточно данных для velocity" />}
      </div>

      {/* Conversion table */}
      {conversion.length > 0 && (
        <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-craft-border">
            <h3 className="text-xs font-medium text-craft-muted">Детализация переходов</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-craft-border">
                  <th className="text-left px-4 py-2.5 text-craft-muted font-medium">Переход</th>
                  <th className="text-right px-4 py-2.5 text-craft-muted font-medium">Из</th>
                  <th className="text-right px-4 py-2.5 text-craft-muted font-medium">В</th>
                  <th className="text-right px-4 py-2.5 text-craft-muted font-medium">Конверсия</th>
                </tr>
              </thead>
              <tbody>
                {conversion.map((r) => (
                  <tr key={`${r.from}-${r.to}`} className="border-b border-craft-border/50 hover:bg-craft-surface2/50">
                    <td className="px-4 py-2.5 text-white/70">
                      {r.fromLabel} → {r.toLabel}
                    </td>
                    <td className="px-4 py-2.5 text-right text-white/50">{r.fromCount}</td>
                    <td className="px-4 py-2.5 text-right text-white/50">{r.toCount}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`font-medium ${
                        r.rate >= 0.5 ? 'text-craft-green' : r.rate >= 0.25 ? 'text-craft-orange' : 'text-craft-red'
                      }`}>
                        {fmtPct(r.rate)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
