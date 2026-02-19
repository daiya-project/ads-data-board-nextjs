/**
 * Goal Monthly — 광고주 데이터 그래프 · CVR (conversion/click %)
 *
 * 평일 기준 5일 이동평균 + 실제 CVR 꺾은선 차트.
 * 뷰: ads_data_v_ma_cvr. 공통: ma-chart-common, MiniCards.
 * 스펙: docs/ma-chart-dev.md
 */

import { getSupabaseClientSafe } from '@shared/api';
import { chartRegistry, devLog } from '@shared/lib';
import type { SupabaseClient } from '@shared/types';
import {
  findTopEntityByLastDay,
  buildChartDataFromRows,
  renderMaChart,
} from '@shared/ui/common/ma-chart-common';
import {
  renderMaChartCards,
  cleanupMaChartCards,
  type MaChartCardsGetters,
} from '../MiniCards';
import { getCachedRows, setCachedRows } from './MaChartCache';
import { MA_CHART_CANVAS_ID } from '../../lib/chart-constants';
import { ensureChartCanvas } from './MaChartDom';

interface MaCvrViewRow {
  client_id: number;
  manager_id: number;
  date: string;
  cvr: number;
  moving_avg: number;
  gap_pct_cvr: number | null;
}

let selectedClientId: number | null = null;

async function fetchMaCvrViewData(
  supabase: SupabaseClient,
  managerId: number | null
): Promise<MaCvrViewRow[]> {
  const cached = getCachedRows<MaCvrViewRow>(managerId, 'cvr');
  if (cached != null) return cached;

  const pageSize = 1000;
  let allRows: MaCvrViewRow[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const query = managerId != null
      ? supabase
          .from('ads_data_v_ma_cvr')
          .select('client_id, manager_id, date, cvr, moving_avg, gap_pct_cvr')
          .eq('manager_id', managerId)
          .order('date', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1)
      : supabase
          .from('ads_data_v_ma_cvr')
          .select('client_id, manager_id, date, cvr, moving_avg, gap_pct_cvr')
          .order('date', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

    const { data, error } = (await query) as { data: MaCvrViewRow[] | null; error: unknown };
    if (error) {
      devLog('[MaChartCvr] 뷰 조회 오류:', error);
      return [];
    }

    const rows = data ?? [];
    if (rows.length > 0) {
      allRows = allRows.concat(rows);
      hasMore = rows.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }

  const normalized = allRows.map((r) => ({
    ...r,
    client_id: typeof r.client_id === 'string' ? Number(r.client_id) : r.client_id,
    date: typeof r.date === 'string' ? r.date.split('T')[0] : String(r.date),
    cvr: Number((r as { cvr?: unknown }).cvr) || 0,
    moving_avg: Number(r.moving_avg) ?? 0,
    gap_pct_cvr: r.gap_pct_cvr != null ? Number(r.gap_pct_cvr) : null,
  }));
  setCachedRows(managerId, 'cvr', normalized);
  devLog('[MaChartCvr] fetch 완료, 행 수:', normalized.length);
  return normalized;
}

const CVR_GETTERS: MaChartCardsGetters<MaCvrViewRow> = {
  getDate: (r) => r.date,
  getValue: (r) => r.cvr,
  getMa: (r) => r.moving_avg,
  getGapPct: (r) => r.gap_pct_cvr,
  getClientId: (r) => r.client_id,
};

/**
 * 기존 섹션의 캔버스·카드 영역에 CVR 차트와 카드 렌더.
 * top8ClientIds: ads_data_v_ma_revenue 기준 최근 5평일 매출 상위 8명 (미니 차트 고정용).
 */
export async function renderMaChartCvrIntoSection(
  canvasId: string,
  managerId: number | null,
  top8ClientIds: number[]
): Promise<void> {
  ensureChartCanvas(canvasId);
  const supabase = getSupabaseClientSafe();
  if (!supabase) return;

  const rows = await fetchMaCvrViewData(supabase, managerId);
  if (rows.length === 0) {
    const wrapper = document.querySelector('.MaChart__chart-wrapper');
    if (wrapper) {
      wrapper.innerHTML =
        '<div class="MaChart__empty" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">데이터가 없습니다.</div>';
    }
    return;
  }

  const defaultTopId = findTopEntityByLastDay(
    rows,
    (r) => r.date,
    (r) => r.cvr,
    (r) => r.client_id
  );
  const topClientId =
    selectedClientId != null && rows.some((r) => r.client_id === selectedClientId)
      ? selectedClientId
      : defaultTopId;
  if (topClientId == null) return;

  const clientRows = rows
    .filter((r) => r.client_id === topClientId)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (clientRows.length === 0) return;

  const chartData = buildChartDataFromRows(
    clientRows,
    (r) => r.date,
    (r) => r.cvr,
    (r) => r.moving_avg,
    (r) => r.gap_pct_cvr
  );

  // CVR은 뷰에서 소수 비율(0.03 = 3%)로 저장됨 → 퍼센트 표시를 위해 ×100
  const valueFormat = (v: number) => (Number(v) * 100).toFixed(2) + '%';
  const yAxisTickFormat = (v: number) => (Number(v) * 100).toFixed(1) + '%';

  renderMaChart(canvasId, chartData, {
    labelActual: 'CVR',
    labelMa: '이동평균(MA)',
    labelGapPct: '갭(%)',
    valueFormat,
    yAxisTickFormat,
  });

  function updateMainChartAndCards(): void {
    if (!supabase || rows.length === 0) return;
    const nextId =
      selectedClientId != null && rows.some((r) => r.client_id === selectedClientId)
        ? selectedClientId
        : findTopEntityByLastDay(rows, (r) => r.date, (r) => r.cvr, (r) => r.client_id);
    if (nextId == null) return;
    const nextRows = rows
      .filter((r) => r.client_id === nextId)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (nextRows.length === 0) return;
    const nextData = buildChartDataFromRows(
      nextRows,
      (r) => r.date,
      (r) => r.cvr,
      (r) => r.moving_avg,
      (r) => r.gap_pct_cvr
    );
    renderMaChart(canvasId, nextData, {
      labelActual: 'CVR',
      labelMa: '이동평균(MA)',
      labelGapPct: '갭(%)',
      valueFormat,
      yAxisTickFormat,
    });
    cleanupMaChartCards();
    renderMaChartCards(rows, CVR_GETTERS, supabase, selectedClientId, (clientId) => {
      selectedClientId = clientId;
      updateMainChartAndCards();
    }, top8ClientIds);
  }

  await renderMaChartCards(rows, CVR_GETTERS, supabase, topClientId, (clientId) => {
    selectedClientId = clientId;
    updateMainChartAndCards();
  }, top8ClientIds);

  devLog('[MaChartCvr] 렌더링 완료, client_id:', topClientId);
}

/**
 * CVR 차트·카드만 정리 (캔버스 destroy, 툴팁·미니 차트 제거).
 * 지표 전환 시 호출. full cleanup 시에는 ma-chart-revenue에서 호출.
 */
export function cleanupMaChartCvrSection(): void {
  selectedClientId = null;
  chartRegistry.destroy(MA_CHART_CANVAS_ID);
  const tooltip = document.getElementById(`tooltip-${MA_CHART_CANVAS_ID}`);
  if (tooltip) tooltip.remove();
  cleanupMaChartCards();
}
