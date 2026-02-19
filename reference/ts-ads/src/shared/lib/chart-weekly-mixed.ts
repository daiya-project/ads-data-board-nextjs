/**
 * Chart Utils - 주간 매출 & 광고주 수 복합 차트
 */

import { formatNumberWithCommas } from './utils/format';
import { chartRegistry } from './chart-registry';
import type { WeeklyChartItem, TooltipRow } from './chart-utils-types';
import { getOrCreateTooltipEl, buildGridTooltipHTML, positionTooltip } from './chart-tooltip';
import {
  DATA_FONT,
  commonTickStyle,
  commonGridStyle,
  COLOR_BLUE,
  COLOR_RED,
  COLOR_BAR,
  COLOR_BAR_BORDER,
} from './chart-utils-common';

declare const Chart: new (ctx: HTMLElement, config: unknown) => {
  destroy: () => void;
  update: (mode?: string) => void;
  resize: () => void;
  canvas: HTMLCanvasElement;
};

function formatWeekStartForLabel(weekStart: string): string {
  if (!weekStart || typeof weekStart !== 'string') return '';
  const part = weekStart.slice(0, 10);
  if (part.length < 10) return part;
  const [, month, day] = part.split('-');
  return `${month}/${day}`;
}

export function renderWeeklyMixedChart(
  canvasId: string,
  weeklyData: WeeklyChartItem[]
): void {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  chartRegistry.destroy(canvasId);
  const ChartConstructor = (typeof window !== 'undefined' && (window as unknown as { Chart?: { getChart: (c: unknown) => { destroy: () => void } | undefined } }).Chart);
  if (ChartConstructor?.getChart) {
    const existing = ChartConstructor.getChart(ctx);
    if (existing) existing.destroy();
  }

  const ordered = [...weeklyData].reverse();
  const labels = ordered.map((d) => formatWeekStartForLabel(d.weekStart));
  const revenueValues = ordered.map((d) => d.revenue);
  const clientCountValues = ordered.map((d) => d.clientCount);
  const revenueInEon = revenueValues.map((rev) => rev / 100000000);

  const maxClientCount = Math.max(0, ...clientCountValues);
  const y1SuggestedMax = maxClientCount === 0 ? 1 : Math.ceil(maxClientCount * 1.15);

  function weeklyTooltipHandler(context: {
    chart: { canvas: HTMLCanvasElement };
    tooltip: {
      opacity: number;
      caretX: number;
      caretY: number;
      dataPoints?: { dataIndex: number; datasetIndex: number; parsed: { y: number } }[];
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
        if (dp.datasetIndex === 0) {
          rows.push({ color: COLOR_BLUE, label: '매출', value: formatNumberWithCommas(revenueValues[dp.dataIndex]) });
        } else if (dp.datasetIndex === 1) {
          rows.push({ color: COLOR_RED, label: '광고주', value: formatNumberWithCommas(dp.parsed.y) });
        }
      }
    }

    el.innerHTML = buildGridTooltipHTML(rows);
    el.style.opacity = rows.length > 0 ? '1' : '0';
    el.style.pointerEvents = 'none';
    positionTooltip(el, chart.canvas, tooltip.caretX, tooltip.caretY);
  }

  const clientCountLabelPlugin = {
    id: `clientCountLabels_${canvasId}`,
    afterDraw(chart: {
      ctx: CanvasRenderingContext2D;
      getDatasetMeta: (i: number) => { data: { x: number; y: number }[] };
    }) {
      try {
        const c = chart.ctx;
        const meta = chart.getDatasetMeta(1);
        if (!meta?.data?.length) return;
        c.save();
        c.font = `bold 11px ${DATA_FONT}`;
        c.textAlign = 'center';
        c.textBaseline = 'bottom';

        meta.data.forEach((point, index) => {
          const value = clientCountValues[index];
          if (value != null && typeof point.x === 'number' && typeof point.y === 'number') {
            const text = value.toString();
            const textWidth = c.measureText(text).width;
            const pillW = textWidth + 12;
            const pillH = 18;
            const px = point.x - pillW / 2;
            const py = point.y - 12 - pillH;

            c.fillStyle = 'rgba(239, 68, 68, 0.08)';
            c.beginPath();
            const r = 4;
            c.moveTo(px + r, py);
            c.lineTo(px + pillW - r, py);
            c.arcTo(px + pillW, py, px + pillW, py + r, r);
            c.lineTo(px + pillW, py + pillH - r);
            c.arcTo(px + pillW, py + pillH, px + pillW - r, py + pillH, r);
            c.lineTo(px + r, py + pillH);
            c.arcTo(px, py + pillH, px, py + pillH - r, r);
            c.lineTo(px, py + r);
            c.arcTo(px, py, px + r, py, r);
            c.closePath();
            c.fill();

            c.fillStyle = COLOR_RED;
            c.fillText(text, point.x, point.y - 14);
          }
        });
        c.restore();
      } catch (err) {
        console.error('주간 차트 플러그인 오류:', err);
      }
    },
  };

  const instance = new Chart(ctx as HTMLElement, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          type: 'bar',
          label: '주간 매출',
          data: revenueInEon,
          backgroundColor: COLOR_BAR,
          borderColor: COLOR_BAR_BORDER,
          borderWidth: 1,
          borderRadius: 6,
          yAxisID: 'y',
          barPercentage: 0.65,
          order: 1,
        },
        {
          type: 'line',
          label: '주간 광고주 수',
          data: clientCountValues,
          borderColor: COLOR_RED,
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.4,
          yAxisID: 'y1',
          pointRadius: 4,
          pointBackgroundColor: COLOR_RED,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          order: 2,
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
          external: (context: unknown) => weeklyTooltipHandler(context as Parameters<typeof weeklyTooltipHandler>[0]),
        },
      },
      scales: {
        y: {
          type: 'linear',
          position: 'left',
          beginAtZero: true,
          grid: commonGridStyle(),
          ticks: {
            ...commonTickStyle(),
            callback: (value: number) => value.toFixed(2) + '억',
          },
          title: { display: false },
        },
        y1: {
          type: 'linear',
          position: 'right',
          beginAtZero: true,
          suggestedMax: y1SuggestedMax,
          ticks: { callback: (value: number) => value + '개', display: false },
          grid: { drawOnChartArea: false },
          title: { display: false },
        },
        x: {
          grid: { display: false },
          ticks: commonTickStyle(),
        },
      },
    },
    plugins: [clientCountLabelPlugin],
  });

  chartRegistry.register(canvasId, instance);
}
