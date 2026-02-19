/**
 * MA 미니 차트 — X/Y축·범례 없이 매출·MA 꺾은선만
 *
 * 광고주 증감 카드 등 2x4 그리드용 소형 차트.
 * 색상 규칙은 광고주 데이터 그래프와 동일. 툴팁 내용은 호출부에서 주입.
 *
 * 사용처: ma-chart-mini-cards.ts
 */

import { chartRegistry, devLog, escapeHtml } from '@shared/lib';
import type { MaChartSeries } from './ma-chart-common';

const COLOR_ACTUAL = '#4A90E2';
const COLOR_MA = '#64748B';

export interface MaMiniChartOptions {
  /** 마우스 오버 시 표시할 툴팁 문자열 (예: "123. 광고주명") */
  tooltipContent: string;
  colorActual?: string;
  colorMa?: string;
}

declare const Chart: new (
  ctx: HTMLElement,
  config: unknown
) => { destroy: () => void; update: (mode?: string) => void; resize: () => void; canvas: HTMLCanvasElement };

function getOrCreateTooltipEl(canvasId: string): HTMLDivElement {
  const tooltipId = `tooltip-${canvasId}`;
  let el = document.getElementById(tooltipId) as HTMLDivElement | null;
  if (!el) {
    el = document.createElement('div');
    el.id = tooltipId;
    el.className = 'chart-glass-tooltip';
    document.body.appendChild(el);
  }
  return el;
}

function positionTooltip(
  el: HTMLDivElement,
  canvas: HTMLCanvasElement,
  caretX: number,
  caretY: number
): void {
  const rect = canvas.getBoundingClientRect();
  const left = rect.left + window.scrollX + caretX;
  const top = rect.top + window.scrollY + caretY - el.offsetHeight - 14;
  const tooltipWidth = el.offsetWidth;
  let finalLeft = left - tooltipWidth / 2;
  if (finalLeft + tooltipWidth > window.innerWidth) finalLeft = window.innerWidth - tooltipWidth - 8;
  if (finalLeft < 8) finalLeft = 8;
  el.style.left = finalLeft + 'px';
  el.style.top = top + 'px';
  el.style.transform = 'translateX(-50%)';
}

/**
 * 미니 MA 차트 렌더 — 축·범례 없이 X/Y축 + 매출·MA 꺾은선만, 툴팁은 tooltipContent만 표시.
 */
export function renderMaMiniChart(
  canvasId: string,
  data: MaChartSeries,
  options: MaMiniChartOptions
): void {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const ChartConstructor = (typeof window !== 'undefined' && (window as unknown as { Chart?: { getChart: (c: unknown) => { destroy: () => void } | undefined } }).Chart);
  if (!ChartConstructor) {
    devLog('[MaChartMini] Chart.js 미로드');
    return;
  }

  chartRegistry.destroy(canvasId);
  const existing = ChartConstructor.getChart(ctx);
  if (existing) existing.destroy();

  const { tooltipContent, colorActual = COLOR_ACTUAL, colorMa = COLOR_MA } = options;
  const { labels, actualData, maData } = data;
  const tooltipEl = getOrCreateTooltipEl(canvasId);

  function externalTooltipHandler(context: {
    chart: { canvas: HTMLCanvasElement };
    tooltip: { opacity: number; caretX: number; caretY: number };
  }): void {
    const { chart, tooltip } = context;
    if (tooltip.opacity === 0) {
      tooltipEl.style.opacity = '0';
      tooltipEl.style.pointerEvents = 'none';
      return;
    }
    tooltipEl.innerHTML = `<div class="cgt-grid"><span class="cgt-label" style="grid-column: 1 / -1">${escapeHtml(tooltipContent)}</span></div>`;
    tooltipEl.style.opacity = '1';
    tooltipEl.style.pointerEvents = 'none';
    positionTooltip(tooltipEl, chart.canvas, tooltip.caretX, tooltip.caretY);
  }

  const instance = new Chart(ctx as HTMLElement, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '매출',
          data: actualData,
          borderColor: colorActual,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          fill: false,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 2,
          order: 2,
        },
        {
          label: 'MA',
          data: maData,
          borderColor: colorMa,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderDash: [4, 2],
          fill: false,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 2,
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: 0 },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: (context: unknown) =>
            externalTooltipHandler(context as Parameters<typeof externalTooltipHandler>[0]),
          intersect: false,
          mode: 'index',
          position: 'nearest',
        },
      },
      interaction: { mode: 'index', intersect: false, axis: 'x' },
      scales: {
        y: {
          type: 'linear',
          position: 'left',
          beginAtZero: true,
          display: false,
          grid: { display: false },
          ticks: { display: false },
        },
        x: {
          display: false,
          grid: { display: false },
          ticks: { display: false },
        },
      },
    },
  });

  chartRegistry.register(canvasId, instance);
}
