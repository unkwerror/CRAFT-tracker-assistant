'use client';
/**
 * CraftChart — thin wrapper around echarts-for-react that injects
 * the CRAFT ECharts theme matching the current app theme.
 *
 * Why a wrapper: theme must be passed to every ReactECharts instance.
 * Centralising here means theme switching (dark/midnight/light)
 * propagates to all charts automatically, with zero per-chart boilerplate.
 *
 * Why inline theme object (not registerTheme):
 * - No global registration state to manage
 * - Supports dynamic theme switching: just re-render with new theme
 * - SSR-safe (no window references at module level)
 */
import dynamic from 'next/dynamic';
import { useTheme } from '@/components/ThemeProvider';
import { getCraftEchartsTheme } from '@/lib/echarts-theme.mjs';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export default function CraftChart({
  option,
  style,
  className = '',
  notMerge = false,
  lazyUpdate = true,
  onEvents,
  opts,
}) {
  const { theme } = useTheme();
  const echartsTheme = getCraftEchartsTheme(theme);

  return (
    <ReactECharts
      option={option}
      theme={echartsTheme}
      style={{ height: 220, ...style }}
      className={className}
      notMerge={notMerge}
      lazyUpdate={lazyUpdate}
      onEvents={onEvents}
      opts={{ renderer: 'canvas', ...opts }}
    />
  );
}
