/**
 * Revenue Trend - 차트 렌더링
 */

import { formatNumberWithCommas, chartRegistry, devLog } from '@shared/lib';
import { CANVAS_ID, DATA_FONT, COLOR_BLUE, COLOR_BLUE_LIGHT, COLOR_RED } from './revenue-trend-constants';
import { getOrCreateTooltipEl, buildGridTooltipHTML, positionTooltip } from './revenue-trend-tooltip';

declare const Chart: new (ctx: HTMLElement, config: unknown) => {
  destroy: () => void;
  update: (mode?: string) => void;
  resize: () => void;
  canvas: HTMLCanvasElement;
};

/**
 * 매출 변화량 라인 차트 렌더링
 */
export function renderTrendChart(
  dates: string[],
  dailyTotals: number[],
  dailyChanges: number[]
): void {
  const ctx = document.getElementById(CANVAS_ID);
  if (!ctx) return;

  const ChartConstructor = (typeof window !== 'undefined' && (window as unknown as { Chart?: { getChart: (c: unknown) => { destroy: () => void } | undefined } }).Chart);
  if (!ChartConstructor) {
    devLog('[RevenueTrend] Chart.js 미로드');
    return;
  }

  chartRegistry.destroy(CANVAS_ID);
  const existing = ChartConstructor.getChart(ctx);
  if (existing) existing.destroy();

  const labels = dates.map((d) => {
    const parts = d.split('-');
    return `${parts[1]}/${parts[2]}`;
  });

  const changeColors = dailyChanges.map((val) =>
    val >= 0 ? 'rgba(239, 68, 68, 0.65)' : 'rgba(59, 130, 246, 0.65)'
  );
  const changeBorderColors = dailyChanges.map((val) =>
    val >= 0 ? 'rgba(239, 68, 68, 0.9)' : 'rgba(59, 130, 246, 0.9)'
  );

  const tooltipEl = getOrCreateTooltipEl(CANVAS_ID);

  function externalTooltipHandler(context: {
    chart: { canvas: HTMLCanvasElement };
    tooltip: {
      opacity: number;
      caretX: number;
      caretY: number;
      dataPoints?: { dataIndex: number; datasetIndex: number; parsed: { y: number } }[];
    };
  }): void {
    const { chart, tooltip } = context;

    if (tooltip.opacity === 0) {
      tooltipEl.style.opacity = '0';
      tooltipEl.style.pointerEvents = 'none';
      return;
    }

    const rows: { color: string; label: string; value: string }[] = [];
    if (tooltip.dataPoints) {
      for (const dp of tooltip.dataPoints) {
        if (dp.datasetIndex === 0) {
          rows.push({
            color: COLOR_BLUE,
            label: '매출',
            value: formatNumberWithCommas(dailyTotals[dp.dataIndex]),
          });
        } else if (dp.datasetIndex === 1) {
          const change = dailyChanges[dp.dataIndex];
          const prefix = change >= 0 ? '+' : '';
          rows.push({
            color: change >= 0 ? COLOR_RED : '#3B82F6',
            label: '변화',
            value: `${prefix}${formatNumberWithCommas(change)}`,
          });
        }
      }
    }

    tooltipEl.innerHTML = buildGridTooltipHTML(rows);
    tooltipEl.style.opacity = rows.length > 0 ? '1' : '0';
    tooltipEl.style.pointerEvents = 'none';
    positionTooltip(tooltipEl, chart.canvas, tooltip.caretX, tooltip.caretY);
  }

  const verticalGuidePlugin = {
    id: `verticalGuideLine_${CANVAS_ID}`,
    afterEvent(_chart: unknown) {
      (_chart as { draw: () => void }).draw();
    },
    afterDraw(chart: {
      ctx: CanvasRenderingContext2D;
      getActiveElements: () => { element: { x: number } }[];
      scales: { y: { top: number; bottom: number } };
    }) {
      const c = chart.ctx;
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

  const areaGradientPlugin = {
    id: `areaGradientFill_${CANVAS_ID}`,
    afterLayout(chart: {
      ctx: CanvasRenderingContext2D;
      chartArea: { top: number; bottom: number };
      data: { datasets: { backgroundColor: unknown }[] };
    }) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      gradient.addColorStop(0, 'rgba(74, 144, 226, 0.25)');
      gradient.addColorStop(0.6, 'rgba(74, 144, 226, 0.06)');
      gradient.addColorStop(1, 'rgba(74, 144, 226, 0)');
      chart.data.datasets[0].backgroundColor = gradient;
    },
  };

  const instance = new Chart(ctx as HTMLElement, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          type: 'line',
          label: '일별 매출',
          data: dailyTotals,
          borderColor: COLOR_BLUE,
          backgroundColor: COLOR_BLUE_LIGHT,
          borderWidth: 2.5,
          fill: 'origin',
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: COLOR_BLUE,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          yAxisID: 'y',
          order: 1,
        },
        {
          type: 'bar',
          label: '전일 대비 변화',
          data: dailyChanges,
          backgroundColor: changeColors,
          borderColor: changeBorderColors,
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: 'y',
          barPercentage: 0.5,
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
          external: (context: unknown) =>
            externalTooltipHandler(
              context as Parameters<typeof externalTooltipHandler>[0]
            ),
          intersect: false,
          mode: 'index',
          position: 'nearest',
          caretPadding: 40,
        },
      },
      interaction: { mode: 'index', intersect: false, axis: 'x' },
      scales: {
        y: {
          type: 'linear',
          position: 'left',
          beginAtZero: true,
          grid: {
            color: 'rgba(226, 232, 240, 0.4)',
            drawBorder: false,
          },
          ticks: {
            font: { family: DATA_FONT, size: 11 },
            color: '#9CA3AF',
            callback: (value: number) => {
              if (Math.abs(value) >= 100000000) {
                return (value / 100000000).toFixed(1) + '억';
              }
              if (Math.abs(value) >= 10000) {
                return (value / 10000).toFixed(0) + '만';
              }
              return formatNumberWithCommas(value);
            },
          },
        },
        x: {
          grid: { display: false },
          ticks: {
            font: { family: DATA_FONT, size: 11 },
            color: '#9CA3AF',
          },
        },
      },
    },
    plugins: [verticalGuidePlugin, areaGradientPlugin],
  });

  chartRegistry.register(CANVAS_ID, instance);
}
