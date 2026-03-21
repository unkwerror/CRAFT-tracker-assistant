/**
 * ECharts theme factory for CRAFT design system.
 *
 * Integration approach: inline theme objects (not registerTheme).
 * Reason: supports dynamic theme switching without managing global
 * registration state, and is SSR-safe. Pass the result of
 * getCraftEchartsTheme(themeId) directly to ReactECharts theme prop.
 */

import { THEMES, DEFAULT_THEME } from '@/lib/themes.mjs';

function rgb(triplet) {
  return `rgb(${triplet.replace(/ /g, ',')})`;
}

function rgba(triplet, alpha) {
  return `rgba(${triplet.replace(/ /g, ',')},${alpha})`;
}

/**
 * Build a complete ECharts theme config from a CRAFT theme.
 * @param {string} themeId — 'dark' | 'midnight' | 'light'
 */
export function getCraftEchartsTheme(themeId) {
  const t = THEMES[themeId] || THEMES[DEFAULT_THEME];
  const c = t.colors;
  const isLight = themeId === 'light';

  const textPrimary   = isLight ? 'rgba(0,0,0,0.75)'  : 'rgba(255,255,255,0.65)';
  const textSecondary = isLight ? 'rgba(0,0,0,0.40)'  : 'rgba(255,255,255,0.30)';
  const gridLine      = isLight ? 'rgba(0,0,0,0.08)'  : 'rgba(255,255,255,0.06)';
  const axisLine      = isLight ? 'rgba(0,0,0,0.15)'  : 'rgba(255,255,255,0.10)';
  const tooltipBg     = isLight ? 'rgba(255,255,255,0.95)' : 'rgba(18,18,18,0.92)';
  const tooltipBorder = isLight ? rgba(c.border, 0.9)  : rgba(c.border2, 0.8);
  const tooltipText   = isLight ? 'rgba(0,0,0,0.85)'  : 'rgba(255,255,255,0.85)';

  return {
    color: [
      rgb(c.accent),
      rgb(c.green),
      rgb(c.purple),
      rgb(c.orange),
      rgb(c.red),
      rgb(c.cyan),
    ],

    backgroundColor: 'transparent',

    textStyle: {
      fontFamily: "'Golos Text', system-ui, sans-serif",
      color: textPrimary,
    },

    title: {
      textStyle: { color: textPrimary, fontSize: 13, fontWeight: 500 },
      subtextStyle: { color: textSecondary, fontSize: 11 },
    },

    legend: {
      textStyle: { color: textSecondary, fontSize: 11 },
      inactiveColor: isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)',
      pageTextStyle: { color: textSecondary },
    },

    tooltip: {
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: 1,
      textStyle: { color: tooltipText, fontSize: 12 },
      extraCssText: `border-radius: 8px; backdrop-filter: blur(8px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.35);`,
    },

    grid: {
      borderColor: gridLine,
    },

    categoryAxis: {
      axisLine: { lineStyle: { color: axisLine } },
      axisTick: { lineStyle: { color: axisLine } },
      axisLabel: { color: textSecondary, fontSize: 11 },
      splitLine: { lineStyle: { color: gridLine } },
    },

    valueAxis: {
      axisLine: { lineStyle: { color: axisLine } },
      axisTick: { show: false },
      axisLabel: { color: textSecondary, fontSize: 11 },
      splitLine: { lineStyle: { color: gridLine } },
    },

    logAxis: {
      axisLine: { lineStyle: { color: axisLine } },
      axisTick: { lineStyle: { color: axisLine } },
      axisLabel: { color: textSecondary, fontSize: 11 },
      splitLine: { lineStyle: { color: gridLine } },
    },

    line: {
      lineStyle: { width: 2 },
      symbolSize: 6,
      smooth: false,
      symbol: 'circle',
    },

    bar: {
      barMaxWidth: 40,
      itemStyle: { borderRadius: [3, 3, 0, 0] },
    },

    scatter: {
      symbolSize: 8,
    },

    funnel: {
      label: {
        show: true,
        position: 'inside',
        color: '#fff',
        fontSize: 12,
        fontWeight: 500,
      },
      labelLine: { show: false },
      itemStyle: { borderWidth: 0, borderColor: 'transparent' },
    },

    gauge: {
      title: { color: textSecondary, fontSize: 12 },
      detail: { color: textPrimary },
    },

    candlestick: {
      itemStyle: {
        color: rgb(c.green),
        color0: rgb(c.red),
        borderColor: rgb(c.green),
        borderColor0: rgb(c.red),
      },
    },

    graph: {
      itemStyle: { borderWidth: 0 },
      lineStyle: { width: 1, color: axisLine },
      label: { color: textPrimary },
    },

    radar: {
      axisLine: { lineStyle: { color: axisLine } },
      splitLine: { lineStyle: { color: gridLine } },
      splitArea: { areaStyle: { color: ['transparent', isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)'] } },
      name: { color: textSecondary, fontSize: 11 },
    },

    heatmap: {
      itemStyle: { borderWidth: 1, borderColor: isLight ? 'rgba(255,255,255,0.5)' : rgba(c.bg, 0.5) },
    },

    map: {
      label: { color: textPrimary },
      itemStyle: { borderColor: axisLine },
    },

    dataZoom: [
      {
        backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : rgba(c.surface, 0.6),
        dataBackground: { lineStyle: { color: rgb(c.accent) }, areaStyle: { color: rgba(c.accent, 0.12) } },
        fillerColor: rgba(c.accent, 0.08),
        handleStyle: { color: rgb(c.accent), borderColor: rgba(c.accent, 0.5) },
        moveHandleStyle: { color: rgba(c.accent, 0.4) },
        textStyle: { color: textSecondary },
        borderColor: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)',
      },
    ],

    visualMap: {
      color: [rgb(c.accent), rgb(c.cyan), rgb(c.green)],
      textStyle: { color: textSecondary },
    },

    timeline: {
      lineStyle: { color: rgb(c.accent) },
      itemStyle: { color: rgb(c.accent), borderWidth: 1 },
      controlStyle: { color: textSecondary, borderColor: textSecondary },
      label: { color: textSecondary },
    },

    markPoint: {
      label: { color: '#fff', fontSize: 10 },
    },
  };
}

/** Helper: resolve live CSS variable to rgb triplet (client-only). */
export function getCSSVar(name) {
  if (typeof window === 'undefined') return null;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
