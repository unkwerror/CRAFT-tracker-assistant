'use client';
/**
 * Section 4: Команда — KPI менеджеров, Win/Loss, Когорты.
 *
 * Chart choice: horizontal grouped bar (not radar).
 * Radar with 4+ managers becomes visually illegible (polylines overlap).
 * Horizontal bars allow direct comparison per metric across managers,
 * scale well to 8+ managers, and the audience (non-technical) reads them instantly.
 */
import { useState } from 'react';
import CraftChart from '@/components/ui/CraftChart';

function SectionEmpty({ text = 'Недостаточно данных' }) {
  return <div className="flex items-center justify-center h-40 text-xs text-craft-muted">{text}</div>;
}

function SectionSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-craft-surface2 rounded w-1/3" />
      <div className="h-48 bg-craft-surface2 rounded-lg" />
    </div>
  );
}

function fmtMoney(n) {
  const v = Number(n) || 0;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)} млрд`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)} млн`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)} тыс`;
  return `${Math.round(v)}`;
}

const SUB_TABS = [
  { id: 'kpi', label: 'KPI менеджеров' },
  { id: 'winloss', label: 'Win/Loss' },
  { id: 'cohorts', label: 'Когорты' },
];

export default function ManagersSection({ analytics, loading }) {
  const [tab, setTab] = useState('kpi');

  if (loading) return <SectionSkeleton />;

  const managers = analytics?.managerKPI || [];
  const winLoss = analytics?.winLoss;
  const cohorts = analytics?.cohorts || [];

  // ─── KPI chart (horizontal grouped bar) ───
  const managerOption = managers.length === 0 ? null : {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: { data: ['Выиграно', 'Проиграно', 'Конверсия %'], top: 4, right: 8 },
    xAxis: [
      { type: 'value', name: 'Сделок', nameLocation: 'middle', nameGap: 24 },
      { type: 'value', name: '%', nameLocation: 'middle', nameGap: 24, max: 100, axisLabel: { formatter: '{value}%' } },
    ],
    yAxis: {
      type: 'category',
      data: managers.map((m) => m.manager),
      axisLabel: { width: 100, overflow: 'truncate', fontSize: 10 },
    },
    grid: { left: 110, right: 60, top: 32, bottom: 24 },
    series: [
      {
        name: 'Выиграно',
        type: 'bar',
        xAxisIndex: 0,
        data: managers.map((m) => m.won),
        itemStyle: { borderRadius: [0, 3, 3, 0] },
      },
      {
        name: 'Проиграно',
        type: 'bar',
        xAxisIndex: 0,
        data: managers.map((m) => m.lost),
        itemStyle: { borderRadius: [0, 3, 3, 0] },
      },
      {
        name: 'Конверсия %',
        type: 'line',
        xAxisIndex: 1,
        data: managers.map((m) => m.conversionRate ?? 0),
        symbol: 'circle',
        symbolSize: 8,
        label: { show: true, formatter: (p) => `${p.value}%`, fontSize: 11 },
      },
    ],
  };

  // ─── Win/Loss: source + type stacked bars ───
  const sourceData = winLoss?.sourceConversion || [];
  const typeData = winLoss?.typeConversion || [];

  const winLossSourceOption = sourceData.length === 0 ? null : {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Выиграно', 'Проиграно'], top: 4, right: 8 },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: sourceData.map((s) => s.source),
      axisLabel: { width: 90, overflow: 'truncate', fontSize: 10 },
    },
    grid: { left: 100, right: 16, top: 32, bottom: 16 },
    series: [
      {
        name: 'Выиграно',
        type: 'bar',
        stack: 'total',
        data: sourceData.map((s) => s.won),
        itemStyle: { borderRadius: [0, 0, 0, 0] },
        label: { show: true, position: 'inside', formatter: (p) => p.value > 0 ? p.value : '', fontSize: 10 },
      },
      {
        name: 'Проиграно',
        type: 'bar',
        stack: 'total',
        data: sourceData.map((s) => s.lost),
        label: { show: true, position: 'inside', formatter: (p) => p.value > 0 ? p.value : '', fontSize: 10 },
      },
    ],
  };

  const winLossTypeOption = typeData.length === 0 ? null : {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Выиграно', 'Проиграно'], top: 4, right: 8 },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: typeData.map((s) => s.type),
      axisLabel: { width: 110, overflow: 'truncate', fontSize: 10 },
    },
    grid: { left: 120, right: 16, top: 32, bottom: 16 },
    series: [
      {
        name: 'Выиграно',
        type: 'bar',
        stack: 'total',
        data: typeData.map((s) => s.won),
        label: { show: true, position: 'inside', formatter: (p) => p.value > 0 ? p.value : '', fontSize: 10 },
      },
      {
        name: 'Проиграно',
        type: 'bar',
        stack: 'total',
        data: typeData.map((s) => s.lost),
        label: { show: true, position: 'inside', formatter: (p) => p.value > 0 ? p.value : '', fontSize: 10 },
      },
    ],
  };

  // ─── Cohort heatmap (conversionRate by period) ───
  const cohortOption = cohorts.length === 0 ? null : (() => {
    const periods = cohorts.map((c) => c.period);
    const metrics = ['Выиграно', 'Активных', 'Проиграно'];
    const heatData = [];
    cohorts.forEach((c, xi) => {
      heatData.push([xi, 0, c.won]);
      heatData.push([xi, 1, c.active]);
      heatData.push([xi, 2, c.lost]);
    });
    return {
      tooltip: {
        formatter: (p) => `${periods[p.data[0]]}<br/>${metrics[p.data[1]]}: ${p.data[2]}`,
      },
      grid: { left: 80, right: 60, top: 8, bottom: 40 },
      xAxis: { type: 'category', data: periods, axisLabel: { rotate: 30, fontSize: 10 } },
      yAxis: { type: 'category', data: metrics, axisLabel: { fontSize: 10 } },
      visualMap: {
        min: 0,
        max: Math.max(...cohorts.map((c) => Math.max(c.won, c.lost, c.active)), 1),
        calculable: true,
        orient: 'vertical',
        right: 4,
        top: 8,
        textStyle: { fontSize: 10 },
      },
      series: [
        {
          type: 'heatmap',
          data: heatData,
          label: { show: true, fontSize: 10 },
        },
      ],
    };
  })();

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-craft-border pb-0">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'border-craft-accent text-craft-accent'
                : 'border-transparent text-craft-muted hover:text-white/70'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* KPI tab */}
      {tab === 'kpi' && (
        <div className="space-y-5">
          <div className="bg-craft-surface border border-craft-border rounded-xl p-4">
            <h3 className="text-xs font-medium text-craft-muted mb-3">Выигранные / проигранные сделки + конверсия</h3>
            {managerOption
              ? <CraftChart option={managerOption} style={{ height: Math.max(180, managers.length * 40 + 60) }} />
              : <SectionEmpty text="Нет данных по менеджерам" />}
          </div>

          {managers.length > 0 && (
            <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-craft-border">
                <h3 className="text-xs font-medium text-craft-muted">Лидерборд</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-craft-border">
                      <th className="text-left px-4 py-2.5 text-craft-muted font-medium">Менеджер</th>
                      <th className="text-right px-4 py-2.5 text-craft-muted font-medium">Лидов</th>
                      <th className="text-right px-4 py-2.5 text-craft-muted font-medium">Выиграно</th>
                      <th className="text-right px-4 py-2.5 text-craft-muted font-medium">Конверсия</th>
                      <th className="text-right px-4 py-2.5 text-craft-muted font-medium">Выручка</th>
                      <th className="text-right px-4 py-2.5 text-craft-muted font-medium">Цикл</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managers.map((m, i) => (
                      <tr key={m.manager} className="border-b border-craft-border/50 hover:bg-craft-surface2/50">
                        <td className="px-4 py-2.5">
                          <span className="text-craft-muted mr-2">#{i + 1}</span>
                          <span className="text-white/70">{m.manager}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-white/50">{m.totalLeads}</td>
                        <td className="px-4 py-2.5 text-right text-craft-green font-medium">{m.won}</td>
                        <td className="px-4 py-2.5 text-right text-white/70">
                          {m.conversionRate != null ? `${m.conversionRate}%` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-white/70">{fmtMoney(m.totalRevenue)} ₽</td>
                        <td className="px-4 py-2.5 text-right text-white/50">
                          {m.medianCycleDays != null ? `${m.medianCycleDays}д` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Win/Loss tab */}
      {tab === 'winloss' && (
        <div className="space-y-5">
          {winLoss && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Выиграно', value: winLoss.wonCount, color: 'text-craft-green' },
                { label: 'Проиграно', value: winLoss.lostCount, color: 'text-craft-red' },
                { label: 'Общая конверсия', value: winLoss.overallRate != null ? `${winLoss.overallRate}%` : '—', color: 'text-craft-accent' },
                { label: 'Ср. бюджет (won)', value: winLoss.avgWonBudget ? `${fmtMoney(winLoss.avgWonBudget)} ₽` : '—', color: 'text-craft-green' },
              ].map((card) => (
                <div key={card.label} className="bg-craft-surface border border-craft-border rounded-xl p-4">
                  <div className="text-xs text-craft-muted mb-1">{card.label}</div>
                  <div className={`text-xl font-display font-light ${card.color}`}>{card.value}</div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-craft-surface border border-craft-border rounded-xl p-4">
              <h3 className="text-xs font-medium text-craft-muted mb-3">По источникам</h3>
              {winLossSourceOption
                ? <CraftChart option={winLossSourceOption} style={{ height: Math.max(160, sourceData.length * 30 + 60) }} />
                : <SectionEmpty text="Нет данных по источникам" />}
            </div>
            <div className="bg-craft-surface border border-craft-border rounded-xl p-4">
              <h3 className="text-xs font-medium text-craft-muted mb-3">По типам объектов</h3>
              {winLossTypeOption
                ? <CraftChart option={winLossTypeOption} style={{ height: Math.max(160, typeData.length * 30 + 60) }} />
                : <SectionEmpty text="Нет данных по типам" />}
            </div>
          </div>
        </div>
      )}

      {/* Cohorts tab */}
      {tab === 'cohorts' && (
        <div className="space-y-5">
          <div className="bg-craft-surface border border-craft-border rounded-xl p-4">
            <h3 className="text-xs font-medium text-craft-muted mb-3">Распределение лидов по когортам</h3>
            {cohortOption
              ? <CraftChart option={cohortOption} style={{ height: 180 }} />
              : <SectionEmpty text="Нет когортных данных" />}
          </div>

          {cohorts.length > 0 && (
            <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-craft-border">
                <h3 className="text-xs font-medium text-craft-muted">Таблица когорт</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-craft-border">
                      <th className="text-left px-4 py-2.5 text-craft-muted font-medium">Период</th>
                      <th className="text-right px-4 py-2.5 text-craft-muted font-medium">Всего</th>
                      <th className="text-right px-4 py-2.5 text-craft-muted font-medium">Won</th>
                      <th className="text-right px-4 py-2.5 text-craft-muted font-medium">Lost</th>
                      <th className="text-right px-4 py-2.5 text-craft-muted font-medium">Conv</th>
                      <th className="text-right px-4 py-2.5 text-craft-muted font-medium">Ср. бюджет</th>
                      <th className="text-right px-4 py-2.5 text-craft-muted font-medium">Цикл</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cohorts.map((c) => (
                      <tr key={c.period} className="border-b border-craft-border/50 hover:bg-craft-surface2/50">
                        <td className="px-4 py-2.5 text-white/70">{c.period}</td>
                        <td className="px-4 py-2.5 text-right text-white/50">{c.total}</td>
                        <td className="px-4 py-2.5 text-right text-craft-green">{c.won}</td>
                        <td className="px-4 py-2.5 text-right text-craft-red">{c.lost}</td>
                        <td className="px-4 py-2.5 text-right text-white/70">
                          {c.conversionRate != null ? `${c.conversionRate}%` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-white/50">
                          {c.avgBudget ? `${fmtMoney(c.avgBudget)} ₽` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-white/50">
                          {c.medianCycleDays != null ? `${c.medianCycleDays}д` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
