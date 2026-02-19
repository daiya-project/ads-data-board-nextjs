/**
 * Goal Monthly — 광고주 데이터 그래프 (MA 차트) · 메인/REV
 *
 * MA = Moving Average (이동평균). 평일 기준 5일 이동평균 + 실제 매출 꺾은선 차트.
 * 섹션 HTML·REV 렌더 소유. 토글/cleanup 분기는 MaChartController.
 * 미니 차트 8명은 항상 ads_data_v_ma_revenue 기준. 스펙: docs/ma-chart-dev.md
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
  getTop8ClientIdsByLast5DaysSum,
  type MaChartCardsGetters,
} from '../MiniCards';
import { getCachedRows, setCachedRows } from './MaChartCache';
import { MA_CHART_CANVAS_ID, MA_CHART_CARDS_CONTAINER_ID } from '../../lib/chart-constants';
import { ensureChartCanvas } from './MaChartDom';
import {
  setLastManagerId,
  setSelectedMetric,
  setupMetricToggle,
  cleanupMaChartRevenueSection as controllerCleanup,
  type MaChartControllerDeps,
  type MaChartCleanupDeps,
} from './MaChartController';

/* ---------- 타입 ---------- */

interface MaRevenueViewRow {
  client_id: number;
  manager_id: number;
  date: string;
  amount: number;
  moving_avg: number;
  gap_pct_revenue: number | null;
}

/* ---------- 상태 ---------- */

/** 미니 차트에서 선택한 광고주. null이면 전일 최고 매출 광고주. */
let selectedClientId: number | null = null;

const REV_GETTERS: MaChartCardsGetters<MaRevenueViewRow> = {
  getDate: (r) => r.date,
  getValue: (r) => r.amount,
  getMa: (r) => r.moving_avg,
  getGapPct: (r) => r.gap_pct_revenue,
  getClientId: (r) => r.client_id,
};

/* ---------- 데이터 ---------- */

async function fetchMaRevenueViewData(
  supabase: SupabaseClient,
  managerId: number | null
): Promise<MaRevenueViewRow[]> {
  const cached = getCachedRows<MaRevenueViewRow>(managerId, 'rev');
  if (cached != null) return cached;

  const pageSize = 1000;
  let allRows: MaRevenueViewRow[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const query = managerId != null
      ? supabase
          .from('ads_data_v_ma_revenue')
          .select('client_id, manager_id, date, amount, moving_avg, gap_pct_revenue')
          .eq('manager_id', managerId)
          .order('date', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1)
      : supabase
          .from('ads_data_v_ma_revenue')
          .select('client_id, manager_id, date, amount, moving_avg, gap_pct_revenue')
          .order('date', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

    const { data, error } = (await query) as { data: MaRevenueViewRow[] | null; error: unknown };
    if (error) {
      devLog('[MaChartMain] 뷰 조회 오류:', error);
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
    amount: Number(r.amount) ?? 0,
    moving_avg: Number(r.moving_avg) ?? 0,
    gap_pct_revenue: r.gap_pct_revenue != null ? Number(r.gap_pct_revenue) : null,
  }));
  setCachedRows(managerId, 'rev', normalized);
  return normalized;
}

/**
 * 미니 차트 8명 선정용: ads_data_v_ma_revenue 뷰 기준 최근 5평일 amount 합 상위 8명 client_id.
 */
export async function getTop8ClientIdsFromRevenue(
  managerId: number | null
): Promise<number[]> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return [];
  const rows = await fetchMaRevenueViewData(supabase, managerId);
  return getTop8ClientIdsByLast5DaysSum(
    rows,
    (r) => r.date,
    (r) => r.amount,
    (r) => r.client_id
  );
}

export { ensureChartCanvas } from './MaChartDom';

/* ---------- HTML 구조 ---------- */

function createSectionHTML(): string {
  return `
    <div class="MaChart__section">
      <div class="MaChart__grid">
        <div class="MaChart__chart-area">
          <div class="MaChart__header">
            <h4 class="MaChart__title">
              <span class="MaChart__dot"></span>
              광고주 데이터 그래프
            </h4>
          </div>
          <div class="MaChart__chart-wrapper">
            <canvas id="${MA_CHART_CANVAS_ID}"></canvas>
          </div>
        </div>
        <div class="MaChart__cards-area">
          <div class="MaChart__header">
            <div class="MaChart__metric-toggle" role="group" aria-label="지표 선택">
              <button type="button" class="MaChart__toggle-btn active" data-metric="rev">REV</button>
              <button type="button" class="MaChart__toggle-btn" data-metric="vctr">vCTR</button>
              <button type="button" class="MaChart__toggle-btn" data-metric="cvr">CVR</button>
              <button type="button" class="MaChart__toggle-btn" data-metric="cpc">CPC</button>
            </div>
          </div>
          <div id="${MA_CHART_CARDS_CONTAINER_ID}" class="MaChart__cards-container">
            <div class="MaChart__empty">당분간 비어 있습니다.</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * REV 전용: 캔버스·카드 영역에만 매출 차트와 카드 렌더.
 */
export async function renderMaChartRevenueIntoSection(
  canvasId: string,
  cardsContainerId: string,
  managerId: number | null
): Promise<void> {
  ensureChartCanvas(canvasId);
  const supabase = getSupabaseClientSafe();
  if (!supabase) return;

  const rows = await fetchMaRevenueViewData(supabase, managerId);
  if (rows.length === 0) {
    const wrapper = document.querySelector('.MaChart__chart-wrapper');
    if (wrapper) {
      wrapper.innerHTML =
        '<div class="MaChart__empty" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">데이터가 없습니다.</div>';
    }
    return;
  }

  const top8Ids = getTop8ClientIdsByLast5DaysSum(
    rows,
    (r) => r.date,
    (r) => r.amount,
    (r) => r.client_id
  );
  const defaultTopId = findTopEntityByLastDay(
    rows,
    (r) => r.date,
    (r) => r.amount,
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
    (r) => r.amount,
    (r) => r.moving_avg,
    (r) => r.gap_pct_revenue
  );

  renderMaChart(canvasId, chartData, {
    labelActual: '매출',
    labelMa: '이동평균(MA)',
    labelGapPct: '갭(%)',
  });

  function updateMainChartAndCards(): void {
    if (!supabase || rows.length === 0) return;
    const nextId =
      selectedClientId != null && rows.some((r) => r.client_id === selectedClientId)
        ? selectedClientId
        : findTopEntityByLastDay(rows, (r) => r.date, (r) => r.amount, (r) => r.client_id);
    if (nextId == null) return;
    const nextRows = rows
      .filter((r) => r.client_id === nextId)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (nextRows.length === 0) return;
    const nextData = buildChartDataFromRows(
      nextRows,
      (r) => r.date,
      (r) => r.amount,
      (r) => r.moving_avg,
      (r) => r.gap_pct_revenue
    );
    renderMaChart(canvasId, nextData, {
      labelActual: '매출',
      labelMa: '이동평균(MA)',
      labelGapPct: '갭(%)',
    });
    cleanupMaChartCards();
    renderMaChartCards(rows, REV_GETTERS, supabase, selectedClientId, (clientId) => {
      selectedClientId = clientId;
      updateMainChartAndCards();
    }, top8Ids);
  }

  await renderMaChartCards(rows, REV_GETTERS, supabase, topClientId, (clientId) => {
    selectedClientId = clientId;
    updateMainChartAndCards();
  }, top8Ids);

  devLog('[MaChartMain] REV 렌더링 완료, client_id:', topClientId);
}

/** REV 차트·카드만 제거 (지표 전환 시). selectedClientId는 유지. */
export function destroyMaChartRevenueChartAndCards(): void {
  chartRegistry.destroy(MA_CHART_CANVAS_ID);
  const tooltip = document.getElementById(`tooltip-${MA_CHART_CANVAS_ID}`);
  if (tooltip) tooltip.remove();
  cleanupMaChartCards();
}

export function resetMaChartMainState(): void {
  selectedClientId = null;
}

/* ---------- 공개 API ---------- */

/**
 * MA 차트 섹션 전체 렌더. 섹션 HTML 생성 + 토글 설정 + REV 차트·카드 그리기.
 */
export async function renderMaChartRevenueSection(
  containerId: string,
  _selectedMonth: string,
  managerId: number | null
): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) return;

  setLastManagerId(managerId);
  setSelectedMetric('rev');

  container.innerHTML = createSectionHTML();

  const controllerDeps: MaChartControllerDeps = {
    renderRev: (mid) =>
      renderMaChartRevenueIntoSection(MA_CHART_CANVAS_ID, MA_CHART_CARDS_CONTAINER_ID, mid),
    destroyRev: destroyMaChartRevenueChartAndCards,
    ensureCanvas: () => ensureChartCanvas(MA_CHART_CANVAS_ID),
    getTop8: getTop8ClientIdsFromRevenue,
    resetState: resetMaChartMainState,
  };
  setupMetricToggle(container, controllerDeps);

  await renderMaChartRevenueIntoSection(
    MA_CHART_CANVAS_ID,
    MA_CHART_CARDS_CONTAINER_ID,
    managerId
  );
}

/**
 * MA 차트 섹션 전체 정리 (페이지 이탈·필터 변경 시).
 * controller에 현재 지표별 cleanup 위임 후 상태 초기화.
 */
export function cleanupMaChartRevenueSection(): void {
  controllerCleanup({
    destroyRev: destroyMaChartRevenueChartAndCards,
    resetState: resetMaChartMainState,
  });
}
