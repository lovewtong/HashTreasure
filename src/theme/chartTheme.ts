// src/theme/chartTheme.ts
// --- ECharts ---
export const ECHARTS_HASH_BLUE_LIGHT = {
  color: ['#0078D4', '#02BFE7', '#60A5FA', '#22C55E', '#F59E0B', '#F43F5E'],
  backgroundColor: '#FFFFFF',
  textStyle: { color: '#1F2937' },
  title: { textStyle: { color: '#0F172A' } },
  legend: { textStyle: { color: '#334155' } },
  tooltip: {
    backgroundColor: 'rgba(15,23,42,0.95)', borderColor: 'rgba(2,132,199,.35)',
    textStyle: { color: '#E5E7EB' }
  },
  grid: { left: 40, right: 20, top: 30, bottom: 30 },
  xAxis: {
    axisLine: { lineStyle: { color: '#CBD5E1' } },
    axisLabel: { color: '#334155' }, splitLine: { show: true, lineStyle: { color: '#E5E7EB' } }
  },
  yAxis: {
    axisLine: { lineStyle: { color: '#CBD5E1' } },
    axisLabel: { color: '#334155' }, splitLine: { show: true, lineStyle: { color: '#E5E7EB' } }
  },
  line: { symbol: 'circle', symbolSize: 5, lineStyle: { width: 2 } },
  bar: { barMaxWidth: 28, itemStyle: { borderRadius: [6, 6, 0, 0] } },
};

export const ECHARTS_HASH_BLUE_DARK = {
  color: ['#00A4EF', '#7DD3FC', '#60A5FA', '#34D399', '#FBBF24', '#FB7185'],
  backgroundColor: '#121212',
  textStyle: { color: '#E5E7EB' },
  title: { textStyle: { color: '#F8FAFC' } },
  legend: { textStyle: { color: '#CBD5E1' } },
  tooltip: {
    backgroundColor: 'rgba(2,6,23,.9)', borderColor: 'rgba(0,164,239,.4)',
    textStyle: { color: '#F1F5F9' }
  },
  grid: { left: 40, right: 20, top: 30, bottom: 30 },
  xAxis: {
    axisLine: { lineStyle: { color: '#334155' } },
    axisLabel: { color: '#CBD5E1' }, splitLine: { show: true, lineStyle: { color: 'rgba(148,163,184,.25)' } }
  },
  yAxis: {
    axisLine: { lineStyle: { color: '#334155' } },
    axisLabel: { color: '#CBD5E1' }, splitLine: { show: true, lineStyle: { color: 'rgba(148,163,184,.25)' } }
  },
  line: { symbol: 'circle', symbolSize: 5, lineStyle: { width: 2 } },
  bar: { barMaxWidth: 28, itemStyle: { borderRadius: [6, 6, 0, 0] } },
};

// 用法（ECharts）：
// import * as echarts from 'echarts';
// echarts.registerTheme('hashLight', ECHARTS_HASH_BLUE_LIGHT);
// echarts.registerTheme('hashDark', ECHARTS_HASH_BLUE_DARK);
// const isDark = document.documentElement.classList.contains('dark');
// const chart = echarts.init(dom, isDark ? 'hashDark' : 'hashLight');

// --- Chart.js ---
import type { ChartOptions } from 'chart.js';

export const CHARTJS_HASH_BLUE_BASE: ChartOptions<'line'> = {
  responsive: true,
  plugins: {
    legend: {
      labels: {
        // 颜色在运行时根据深浅模式切换（见下）
        font: { family: 'Segoe UI Variable Text, Segoe UI, Roboto, system-ui' }
      }
    },
    tooltip: { intersect: false, mode: 'index' }
  },
  scales: {
    x: { grid: { display: true } },
    y: { grid: { display: true } }
  }
};

// 运行时根据主题设置调色板
export const getChartJsTheme = (isDark: boolean) => {
  const axisColor = isDark ? '#CBD5E1' : '#334155';
  const gridColor = isDark ? 'rgba(148,163,184,.25)' : '#E5E7EB';
  return {
    borderColor: isDark ? '#00A4EF' : '#0078D4',
    backgroundColors: isDark
      ? ['#00A4EF', '#7DD3FC', '#60A5FA', '#34D399', '#FBBF24', '#FB7185']
      : ['#0078D4', '#02BFE7', '#60A5FA', '#22C55E', '#F59E0B', '#F43F5E'],
    axisColor,
    gridColor,
  };
};
