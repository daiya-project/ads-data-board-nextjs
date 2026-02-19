/**
 * Outbound Section - 차트 렌더링
 */

import { formatNumberWithCommas, chartRegistry } from '@shared/lib';
import type { Outbound3MonthChartData, OutboundWeeklyInfo, ChartMode } from './outbound-types';
import { DATA_FONT, COLOR_BLUE, COLOR_RED } from './outbound-constants';
import { formatDateKorean, formatWeekRangeKorean } from './outbound-format';
import { openDailyDetailModal, openWeeklyDetailModal } from './outbound-modals';

declare const Chart: new (ctx: HTMLElement, config: unknown) => {
  destroy: () => void;
  update: (mode?: string) => void;
  resize: () => void;
  canvas: HTMLCanvasElement;
  getElementsAtEventForMode: (
    e: MouseEvent,
    mode: string,
    options: { intersect: boolean; axis: string },
    useFinal: boolean
  ) => { index: number }[];
};

let chartClickHandler: ((e: MouseEvent) => void) | null = null;
let chartClickCanvas: HTMLCanvasElement | null = null;

/**
 * 3개월 듀얼 축 차트 렌더링
 */
export function renderOutbound3MonthChart(
  canvasId: string,
  chartData: Outbound3MonthChartData,
  mode: ChartMode = 'daily',
  weekRanges: OutboundWeeklyInfo[] = []
): void {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  chartRegistry.destroy(canvasId);
  const ChartConstructor = (typeof window !== 'undefined' && (window as unknown as { Chart?: { getChart: (c: unknown) => { destroy: () => void } | undefined } }).Chart);
  if (ChartConstructor?.getChart) {
    const existing = ChartConstructor.getChart(ctx);
    if (existing) existing.destroy();
  }

  if (chartClickCanvas && chartClickHandler) {
    chartClickCanvas.removeEventListener('click', chartClickHandler);
    chartClickHandler = null;
    chartClickCanvas = null;
  }

  const { labels, dates, dailyValues, clientCounts, lastDataIndex } = chartData;

  const validCounts = clientCounts.filter((v): v is number => v !== null);
  const maxClientCount = Math.max(0, ...validCounts);
  const y1SuggestedMax = maxClientCount === 0 ? 1 : Math.ceil(maxClientCount * 1.3);

  function tooltipHandler(context: {
    chart: { canvas: HTMLCanvasElement };
    tooltip: {
      opacity: number;
      caretX: number;
      caretY: number;
      dataPoints?: { dataIndex: number; datasetIndex: number; parsed: { y: number | null } }[];
    };
  }): void {
    const { chart, tooltip } = context;
    const tooltipId = `tooltip-${canvasId}`;
    let el = document.getElementById(tooltipId) as HTMLDivElement | null;
    if (!el) {
      el = document.createElement('div');
      el.id = tooltipId;
      el.className = 'chart-glass-tooltip';
      document.body.appendChild(el);
    }

    if (tooltip.opacity === 0) {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      return;
    }

    const htmlParts: string[] = [];
    let dateHeader = '';
    if (tooltip.dataPoints && tooltip.dataPoints.length > 0) {
      const idx = tooltip.dataPoints[0].dataIndex;
      if (dates[idx]) {
        if (mode === 'weekly' && weekRanges[idx]) {
          dateHeader = `<span class="cgt-date">${formatWeekRangeKorean(weekRanges[idx].start, weekRanges[idx].end)}</span>`;
        } else {
          dateHeader = `<span class="cgt-date">${formatDateKorean(dates[idx])}</span>`;
        }
      }

      for (const dp of tooltip.dataPoints) {
        if (dp.parsed.y === null) continue;
        const revenueLabel = mode === 'weekly' ? '주간 매출' : '일 매출';
        const clientLabel = mode === 'weekly' ? '활성 광고주' : '신규 광고주';
        if (dp.datasetIndex === 0) {
          htmlParts.push(`<span class="cgt-dot" style="background:${COLOR_BLUE}"></span><span class="cgt-label">${revenueLabel}</span><span class="cgt-value">${formatNumberWithCommas(Math.round(dp.parsed.y))}</span>`);
        } else if (dp.datasetIndex === 1) {
          htmlParts.push(`<span class="cgt-dot" style="background:${COLOR_RED}"></span><span class="cgt-label">${clientLabel}</span><span class="cgt-value">${dp.parsed.y}개</span>`);
        }
      }
    }

    if (htmlParts.length > 0) {
      el.innerHTML = `<div class="cgt-grid">${dateHeader}${htmlParts.join('')}</div>`;
      el.style.opacity = '1';
    } else {
      el.style.opacity = '0';
    }
    el.style.pointerEvents = 'none';

    const rect = chart.canvas.getBoundingClientRect();
    let left = rect.left + window.scrollX + tooltip.caretX;
    const top = rect.top + window.scrollY + tooltip.caretY - el.offsetHeight - 14;
    const tooltipWidth = el.offsetWidth;
    if (left + tooltipWidth / 2 > window.innerWidth) left = window.innerWidth - tooltipWidth - 8;
    if (left - tooltipWidth / 2 < 0) left = tooltipWidth / 2 + 8;
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.style.transform = 'translateX(-50%)';
  }

  const areaGradientPlugin = {
    id: `areaGradient_${canvasId}`,
    afterLayout(chart: {
      ctx: CanvasRenderingContext2D;
      chartArea: { top: number; bottom: number };
      data: { datasets: { backgroundColor: unknown }[] };
    }) {
      const { ctx: c, chartArea } = chart;
      if (!chartArea) return;
      const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      gradient.addColorStop(0, 'rgba(74, 144, 226, 0.25)');
      gradient.addColorStop(0.6, 'rgba(74, 144, 226, 0.06)');
      gradient.addColorStop(1, 'rgba(74, 144, 226, 0)');
      chart.data.datasets[0].backgroundColor = gradient;
    },
  };

  const verticalGuidePlugin = {
    id: `verticalGuide_${canvasId}`,
    afterDraw(chart: {
      ctx: CanvasRenderingContext2D;
      getActiveElements: () => { element: { x: number } }[];
      scales: { y: { top: number; bottom: number } };
    }) {
      const active = chart.getActiveElements();
      if (active.length > 0) {
        const x = active[0].element.x;
        const yAxis = chart.scales.y;
        const c = chart.ctx;
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

  const monthBoundaryPlugin = {
    id: `monthBoundary_${canvasId}`,
    afterDraw(chart: {
      ctx: CanvasRenderingContext2D;
      scales: { x: { getPixelForValue: (i: number) => number }; y: { top: number; bottom: number } };
    }) {
      const c = chart.ctx;
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;

      c.save();
      c.strokeStyle = 'rgba(203, 213, 225, 0.5)';
      c.lineWidth = 1;
      c.setLineDash([6, 4]);

      for (let i = 1; i < labels.length; i++) {
        const isBoundary = mode === 'weekly'
          ? dates[i]?.substring(5, 7) !== dates[i - 1]?.substring(5, 7)
          : labels[i].endsWith('/01');
        if (isBoundary) {
          const x = xScale.getPixelForValue(i);
          c.beginPath();
          c.moveTo(x, yScale.top);
          c.lineTo(x, yScale.bottom);
          c.stroke();
        }
      }
      c.restore();
    },
  };

  const todayLinePlugin = {
    id: `todayLine_${canvasId}`,
    afterDraw(chart: {
      ctx: CanvasRenderingContext2D;
      scales: { x: { getPixelForValue: (i: number) => number }; y: { top: number; bottom: number } };
    }) {
      if (lastDataIndex <= 0 || lastDataIndex >= labels.length - 1) return;
      const c = chart.ctx;
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;
      const x = xScale.getPixelForValue(lastDataIndex);

      c.save();
      c.strokeStyle = 'rgba(107, 114, 128, 0.4)';
      c.lineWidth = 1;
      c.setLineDash([3, 3]);
      c.beginPath();
      c.moveTo(x, yScale.top);
      c.lineTo(x, yScale.bottom);
      c.stroke();
      c.restore();
    },
  };

  const instance = new Chart(ctx as HTMLElement, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '일 매출',
          data: dailyValues,
          borderColor: COLOR_BLUE,
          backgroundColor: 'rgba(74, 144, 226, 0.15)',
          borderWidth: 2,
          fill: 'origin',
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: COLOR_BLUE,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          spanGaps: false,
          yAxisID: 'y',
          order: 2,
        },
        {
          label: '신규 광고주 수',
          data: clientCounts,
          borderColor: COLOR_RED,
          backgroundColor: 'transparent',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: COLOR_RED,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          spanGaps: false,
          yAxisID: 'y1',
          order: 1,
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
          external: (context: unknown) => tooltipHandler(context as Parameters<typeof tooltipHandler>[0]),
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
              if (value >= 100000000) return (value / 100000000).toFixed(1) + '억';
              if (value >= 10000) return (value / 10000).toFixed(0) + '만';
              return formatNumberWithCommas(value);
            },
          },
        },
        y1: {
          type: 'linear',
          position: 'right',
          beginAtZero: true,
          suggestedMax: y1SuggestedMax,
          grid: { drawOnChartArea: false },
          ticks: { display: false },
        },
        x: {
          grid: { display: false },
          ticks: {
            font: { family: DATA_FONT, size: 10 },
            color: '#9CA3AF',
            maxRotation: 0,
            autoSkip: false,
            callback: function(this: unknown, _val: unknown, index: number) {
              const label = labels[index];
              if (!label) return '';
              if (mode === 'weekly') return label;
              if (label.endsWith('/01') || label.endsWith('/15')) return label;
              return '';
            },
          },
        },
      },
    },
    plugins: [areaGradientPlugin, verticalGuidePlugin, monthBoundaryPlugin, todayLinePlugin],
  });

  chartRegistry.register(canvasId, instance);

  const canvasEl = ctx as HTMLCanvasElement;
  canvasEl.style.cursor = 'pointer';

  chartClickHandler = (event: MouseEvent) => {
    const chartInstance = instance as unknown as {
      getElementsAtEventForMode: (
        e: MouseEvent,
        mode: string,
        options: { intersect: boolean; axis: string },
        useFinal: boolean
      ) => { index: number }[];
    };

    const elements = chartInstance.getElementsAtEventForMode(
      event, 'index', { intersect: false, axis: 'x' }, true
    );

    if (elements.length > 0) {
      const dataIndex = elements[0].index;
      if (dataIndex <= lastDataIndex && dates[dataIndex]) {
        if (mode === 'weekly' && weekRanges[dataIndex]) {
          openWeeklyDetailModal(weekRanges[dataIndex].start, weekRanges[dataIndex].end);
        } else {
          openDailyDetailModal(dates[dataIndex]);
        }
      }
    }
  };
  canvasEl.addEventListener('click', chartClickHandler);
  chartClickCanvas = canvasEl;
}

/**
 * 차트 클릭 핸들러 제거 (섹션 정리 시 호출)
 */
export function cleanupOutboundChart(canvasId: string): void {
  const el = document.getElementById(canvasId);
  if (el && chartClickHandler) {
    el.removeEventListener('click', chartClickHandler);
  }
  chartClickHandler = null;
  chartClickCanvas = null;
}
