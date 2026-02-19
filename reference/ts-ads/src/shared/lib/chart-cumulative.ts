/**
 * Chart Utils - 누적 매출 라인 차트 (Area Chart)
 */

import { formatNumberWithCommas } from './utils/format';
import { chartRegistry } from './chart-registry';
import type { MonthlyChartData, TooltipRow } from './chart-utils-types';
import { getOrCreateTooltipEl, buildGridTooltipHTML, positionTooltip } from './chart-tooltip';
import {
  commonTickStyle,
  commonGridStyle,
  COLOR_BLUE,
  COLOR_BLUE_LIGHT,
  COLOR_RED_LIGHT,
} from './chart-utils-common';

declare const Chart: new (ctx: HTMLElement, config: unknown) => {
  destroy: () => void;
  update: (mode?: string) => void;
  resize: () => void;
  canvas: HTMLCanvasElement;
};

const areaGradientPlugin = {
  id: 'areaGradientFill',
  afterLayout(chart: {
    ctx: CanvasRenderingContext2D;
    chartArea: { top: number; bottom: number };
    data: { datasets: { backgroundColor: unknown }[] };
  }) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, 'rgba(74, 144, 226, 0.3)');
    gradient.addColorStop(0.6, 'rgba(74, 144, 226, 0.08)');
    gradient.addColorStop(1, 'rgba(74, 144, 226, 0)');
    chart.data.datasets[0].backgroundColor = gradient;
  },
};

export function renderCumulativeChart(
  canvasId: string,
  monthlyData: MonthlyChartData
): void {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  chartRegistry.destroy(canvasId);
  const ChartConstructor = (typeof window !== 'undefined' && (window as unknown as { Chart?: { getChart: (c: unknown) => { destroy: () => void } | undefined } }).Chart);
  if (ChartConstructor?.getChart) {
    const existing = ChartConstructor.getChart(ctx);
    if (existing) existing.destroy();
  }

  const daysInMonth = monthlyData.daysInMonth;
  const allLabels: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    allLabels.push(`${day}일`);
  }

  const actualValues: (number | null)[] = [];
  const projectedValues: (number | null)[] = [];
  const goalLine: number[] = [];
  const lastDataDay = monthlyData.lastDataDay;
  const actualDataMap = new Map(monthlyData.data.map((d) => [d.day, d.cumulative]));
  const projectedDataMap = new Map(monthlyData.projectedData.map((d) => [d.day, d.cumulative]));
  const goalPerDay = monthlyData.goal / daysInMonth;

  for (let day = 1; day <= daysInMonth; day++) {
    if (actualDataMap.has(day)) {
      actualValues.push(actualDataMap.get(day)!);
      if (day === lastDataDay && lastDataDay < daysInMonth) {
        projectedValues.push(actualDataMap.get(day)!);
      } else {
        projectedValues.push(null);
      }
    } else if (projectedDataMap.has(day)) {
      actualValues.push(null);
      projectedValues.push(Math.round(projectedDataMap.get(day)!));
    } else {
      actualValues.push(null);
      projectedValues.push(null);
    }
    goalLine.push(Math.round(goalPerDay * day));
  }

  function cumulativeTooltipHandler(context: {
    chart: { canvas: HTMLCanvasElement };
    tooltip: {
      opacity: number;
      caretX: number;
      caretY: number;
      dataPoints?: { dataIndex: number; datasetIndex: number; parsed: { y: number | null } }[];
    };
  }): void {
    const { chart, tooltip } = context;
    const el = getOrCreateTooltipEl(canvasId);

    if (tooltip.opacity === 0) {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      return;
    }

    const rows: TooltipRow[] = [];
    if (tooltip.dataPoints) {
      for (const dp of tooltip.dataPoints) {
        const day = dp.dataIndex + 1;
        const isActual = actualDataMap.has(day);
        const value = dp.parsed.y;

        if (dp.datasetIndex === 0 && value !== null && isActual) {
          rows.push({ color: COLOR_BLUE, label: '누적', value: formatNumberWithCommas(value) });
        } else if (dp.datasetIndex === 1 && value !== null && !isActual) {
          rows.push({ color: COLOR_BLUE_LIGHT, label: '예상', value: formatNumberWithCommas(Math.round(value)) });
        } else if (dp.datasetIndex === 2) {
          rows.push({ color: COLOR_RED_LIGHT, label: '목표', value: formatNumberWithCommas(Math.round(goalLine[dp.dataIndex])) });
        }
      }
    }

    el.innerHTML = buildGridTooltipHTML(rows);
    el.style.opacity = rows.length > 0 ? '1' : '0';
    el.style.pointerEvents = 'none';
    positionTooltip(el, chart.canvas, tooltip.caretX, tooltip.caretY);
  }

  const verticalGuideLinePlugin = {
    id: `verticalGuideLine_${canvasId}`,
    afterEvent(_chart: unknown) {
      (_chart as { draw: () => void }).draw();
    },
    afterDraw(chart: {
      ctx: CanvasRenderingContext2D;
      getDatasetMeta: (i: number) => { data: { x: number; y: number }[] };
      getActiveElements: () => { element: { x: number } }[];
      scales: { y: { top: number; bottom: number } };
    }) {
      const c = chart.ctx;
      const meta = chart.getDatasetMeta(0);
      if (!meta?.data?.length) return;
      const active = chart.getActiveElements();
      if (active.length > 0) {
        const x = active[0].element.x;
        const yAxis = chart.scales.y;
        c.save();
        c.strokeStyle = 'rgba(156, 163, 175, 0.35)';
        c.lineWidth = 1;
        c.setLineDash([4, 4]);
        c.beginPath();
        c.moveTo(x, yAxis.top);
        c.lineTo(x, yAxis.bottom);
        c.stroke();
        c.restore();
      }
    },
  };

  const instance = new Chart(ctx as HTMLElement, {
    type: 'line',
    data: {
      labels: allLabels,
      datasets: [
        {
          label: '누적 매출',
          data: actualValues,
          borderColor: COLOR_BLUE,
          backgroundColor: 'rgba(74, 144, 226, 0.15)',
          borderWidth: 2.5,
          fill: 'origin',
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: COLOR_BLUE,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          spanGaps: false,
        },
        {
          label: '예측 매출',
          data: projectedValues,
          borderColor: COLOR_BLUE_LIGHT,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [6, 4],
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          spanGaps: false,
        },
        {
          label: '목표선',
          data: goalLine,
          borderColor: COLOR_RED_LIGHT,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderDash: [6, 4],
          fill: false,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: (context: unknown) => cumulativeTooltipHandler(context as Parameters<typeof cumulativeTooltipHandler>[0]),
          intersect: false,
          mode: 'index',
          position: 'nearest',
          caretPadding: 40,
        },
      },
      interaction: { mode: 'index', intersect: false, axis: 'x' },
      scales: {
        y: {
          beginAtZero: true,
          grid: commonGridStyle(),
          ticks: {
            ...commonTickStyle(),
            callback: (value: number) => (value / 100000000).toFixed(2) + '억',
          },
        },
        x: {
          grid: { display: false },
          ticks: commonTickStyle(),
        },
      },
    },
    plugins: [verticalGuideLinePlugin, areaGradientPlugin],
  });

  chartRegistry.register(canvasId, instance);
}
