/**
 * MA 차트 공통 로직 — 이동평균 + 실제값 이중 꺾은선 차트
 *
 * 동일한 패턴의 MA 차트(매출, VIMP, 전환 등)를 3~4개 이상 만들 때 재사용.
 * - 데이터: 전일 기준 최고값 entity 선택, 시계열 정리
 * - 차트: 실제값/MA 이중선, MA 대비 영역 색칠(빨강/파랑), 글래스 툴팁, 세로 가이드
 *
 * 사용처: ma-chart-revenue, ma-chart-vimp, ma-chart-conversion 등
 * 스펙: docs/ma-chart-dev.md §12 공통 로직 활용 가이드
 */

import { formatNumberWithCommas, chartRegistry, devLog } from '@shared/lib';
import {
  createFillBetweenLinesPlugin,
  createVerticalGuidePlugin,
} from './ma-chart-plugins';

/* ---------- 타입 ---------- */

/** 차트에 넣을 시계열 데이터 (한 entity의 일별 actual / MA / 갭%) */
export interface MaChartSeries {
  labels: string[];
  actualData: number[];
  maData: number[];
  gapPctData: (number | null)[];
}

/** 차트 렌더 시 옵션 — 라벨·색상·폰트·포맷 */
export interface MaChartRenderOptions {
  /** 실제값 라벨 (툴팁·데이터셋) */
  labelActual?: string;
  /** 이동평균 라벨 */
  labelMa?: string;
  /** 갭(%) 라벨 */
  labelGapPct?: string;
  /** 실제값 선 색 */
  colorActual?: string;
  /** MA 선 색 */
  colorMa?: string;
  /** 실제값 > MA 영역 fill */
  colorAboveMa?: string;
  /** 실제값 < MA 영역 fill */
  colorBelowMa?: string;
  /** Y축/툴팁 숫자 폰트 */
  dataFont?: string;
  /** 툴팁·데이터셋 값 포맷 (예: vCTR/CVR용 v => v.toFixed(2) + '%') */
  valueFormat?: (v: number) => string;
  /** Y축 눈금 포맷 (기본: 만/억). vCTR/CVR은 v => v.toFixed(1) + '%' 등 */
  yAxisTickFormat?: (v: number) => string;
}

function defaultValueFormat(v: number): string {
  return formatNumberWithCommas(v);
}

function defaultYAxisTickFormat(value: number): string {
  if (typeof value !== 'number') return String(value);
  if (Math.abs(value) >= 100000000) return (value / 100000000).toFixed(1) + '억';
  if (Math.abs(value) >= 10000) return (value / 10000).toFixed(0) + '만';
  return formatNumberWithCommas(value);
}

const DEFAULT_OPTIONS: Omit<Required<MaChartRenderOptions>, 'valueFormat' | 'yAxisTickFormat'> & {
  valueFormat: (v: number) => string;
  yAxisTickFormat: (v: number) => string;
} = {
  labelActual: '실제값',
  labelMa: '이동평균(MA)',
  labelGapPct: '갭(%)',
  colorActual: '#4A90E2',
  colorMa: '#64748B',
  colorAboveMa: 'rgba(239, 68, 68, 0.25)',
  colorBelowMa: 'rgba(59, 130, 246, 0.2)',
  dataFont: "'Roboto Mono', 'SF Mono', monospace",
  valueFormat: defaultValueFormat,
  yAxisTickFormat: defaultYAxisTickFormat,
};

/* ---------- 데이터 헬퍼 ---------- */

/**
 * 마지막 날(전일)에 값(amount)이 가장 큰 entity id 선택.
 * 뷰 행 타입이 달라도 getDate/getAmount/getEntityId만 주면 동작.
 */
export function findTopEntityByLastDay<T>(
  rows: T[],
  getDate: (r: T) => string,
  getAmount: (r: T) => number,
  getEntityId: (r: T) => number
): number | null {
  if (rows.length === 0) return null;

  const lastDate = rows.reduce((max, r) => {
    const d = getDate(r);
    return d > max ? d : max;
  }, getDate(rows[0]));

  const lastDayRows = rows.filter((r) => getDate(r) === lastDate);
  if (lastDayRows.length === 0) return null;

  const top = lastDayRows.reduce(
    (best, r) => (getAmount(r) > getAmount(best) ? r : best),
    lastDayRows[0]
  );
  return getEntityId(top);
}

/**
 * 한 entity의 행 배열을 차트 시계열(라벨, 실제, MA, 갭%)로 변환.
 * date 기준 정렬은 호출 측에서 수행 후 넘기면 됨.
 */
export function buildChartDataFromRows<T>(
  rows: T[],
  getDate: (r: T) => string,
  getAmount: (r: T) => number,
  getMa: (r: T) => number,
  getGapPct: (r: T) => number | null,
  formatLabel?: (dateStr: string) => string
): MaChartSeries {
  const fmt = formatLabel ?? formatDateLabelDefault;
  return {
    labels: rows.map((r) => fmt(getDate(r))),
    actualData: rows.map((r) => getAmount(r)),
    maData: rows.map((r) => getMa(r)),
    gapPctData: rows.map((r) => getGapPct(r)),
  };
}

/** 날짜 문자열 → X축 라벨 (MM/DD) */
function formatDateLabelDefault(dateStr: string): string {
  const parts = String(dateStr).split('-');
  if (parts.length >= 3) return `${parts[1]}/${parts[2]}`;
  return dateStr;
}

/* ---------- 툴팁 (공통) ---------- */

export function getOrCreateTooltipEl(canvasId: string): HTMLDivElement {
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

export function buildMaTooltipHTML(
  rows: { color: string; label: string; value: string }[]
): string {
  if (rows.length === 0) return '';
  let html = '<div class="cgt-grid">';
  for (const row of rows) {
    html += `<span class="cgt-dot" style="background:${row.color}"></span>`;
    html += `<span class="cgt-label">${row.label}</span>`;
    html += `<span class="cgt-value">${row.value}</span>`;
  }
  html += '</div>';
  return html;
}

export function positionTooltip(
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

/* ---------- 차트 렌더 (공통) ---------- */

declare const Chart: new (
  ctx: HTMLElement,
  config: unknown
) => { destroy: () => void; update: (mode?: string) => void; resize: () => void; canvas: HTMLCanvasElement };

/**
 * MA 차트 렌더링 — 실제값/이동평균 이중선, MA 대비 영역 색칠, 글래스 툴팁, 세로 가이드.
 * canvasId에 해당하는 요소가 있어야 하며, Chart.js가 로드되어 있어야 함.
 */
export function renderMaChart(
  canvasId: string,
  data: MaChartSeries,
  options: MaChartRenderOptions = {}
): void {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const Chart = (typeof window !== 'undefined' && (window as unknown as { Chart?: { getChart: (ctx: unknown) => { destroy: () => void } | undefined } }).Chart);
  if (!Chart) {
    devLog('[MaChartCommon] Chart.js 미로드');
    return;
  }

  chartRegistry.destroy(canvasId);
  const existing = Chart.getChart(ctx);
  if (existing) existing.destroy();

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { labels, actualData, maData, gapPctData } = data;
  const tooltipEl = getOrCreateTooltipEl(canvasId);

  function externalTooltipHandler(context: {
    chart: { canvas: HTMLCanvasElement };
    tooltip: {
      opacity: number;
      caretX: number;
      caretY: number;
      dataPoints?: { dataIndex: number }[];
    };
  }): void {
    const { chart, tooltip } = context;
    if (tooltip.opacity === 0) {
      tooltipEl.style.opacity = '0';
      tooltipEl.style.pointerEvents = 'none';
      return;
    }

    const valueFmt = opts.valueFormat ?? defaultValueFormat;
    const rows: { color: string; label: string; value: string }[] = [];
    const idx = tooltip.dataPoints?.[0]?.dataIndex ?? 0;
    if (idx >= 0 && idx < labels.length) {
      rows.push({ color: '#94A3B8', label: '날짜', value: labels[idx] });
      rows.push({
        color: opts.colorActual,
        label: opts.labelActual,
        value: valueFmt(actualData[idx]),
      });
      rows.push({
        color: opts.colorMa,
        label: opts.labelMa,
        value: valueFmt(maData[idx]),
      });
      const gap = gapPctData[idx];
      const gapStr = gap != null ? `${gap >= 0 ? '+' : ''}${gap.toFixed(1)}%` : '-';
      rows.push({
        color: gap != null && gap >= 0 ? '#EF4444' : '#3B82F6',
        label: opts.labelGapPct,
        value: gapStr,
      });
    }

    tooltipEl.innerHTML = buildMaTooltipHTML(rows);
    tooltipEl.style.opacity = rows.length > 0 ? '1' : '0';
    tooltipEl.style.pointerEvents = 'none';
    positionTooltip(tooltipEl, chart.canvas, tooltip.caretX, tooltip.caretY);
  }

  const fillPlugin = createFillBetweenLinesPlugin(
    canvasId,
    actualData,
    maData,
    opts.colorAboveMa,
    opts.colorBelowMa
  );
  const verticalGuidePlugin = createVerticalGuidePlugin(canvasId);

  const instance = new Chart(ctx as HTMLElement, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: opts.labelActual,
          data: actualData,
          borderColor: opts.colorActual,
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          fill: false,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: opts.colorActual,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          order: 2,
        },
        {
          label: opts.labelMa,
          data: maData,
          borderColor: opts.colorMa,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [6, 4],
          fill: false,
          tension: 0.35,
          pointRadius: 2,
          pointHoverRadius: 4,
          pointBackgroundColor: opts.colorMa,
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
          external: (context: unknown) =>
            externalTooltipHandler(context as Parameters<typeof externalTooltipHandler>[0]),
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
          grid: { color: 'rgba(226, 232, 240, 0.4)', drawBorder: false },
          ticks: {
            font: { family: opts.dataFont, size: 11 },
            color: '#9CA3AF',
            callback: (value: number) => (opts.yAxisTickFormat ?? defaultYAxisTickFormat)(value),
          },
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: opts.dataFont, size: 11 }, color: '#9CA3AF' },
        },
      },
    },
    plugins: [fillPlugin, verticalGuidePlugin],
  });

  chartRegistry.register(canvasId, instance);
}
