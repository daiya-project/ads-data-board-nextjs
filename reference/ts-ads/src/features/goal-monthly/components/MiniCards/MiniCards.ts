/**
 * Goal Monthly — 미니 카드 (2×4 미니 차트 그리드)
 *
 * REV / vCTR / CVR / CPC 공통: 제네릭 getter로 행 타입 구분.
 * 미니 차트 8명은 항상 ads_data_v_ma_revenue 뷰 기준 최근 5평일 amount 합 상위 8명
 * (top8ClientIds로 전달). 클릭 시 해당 client_id를 광고주 데이터 그래프로 전달.
 *
 * 스펙: docs/ma-chart-dev.md (Phase 5)
 * 공통: shared/ma-chart-mini-chart.ts
 */

import { chartRegistry } from '@shared/lib';
import { buildChartDataFromRows, type MaChartSeries } from '@shared/ui/common/ma-chart-common';
import { renderMaMiniChart } from '@shared/ui/common/ma-chart-mini-chart';
import type { SupabaseClient } from '@shared/types';
import {
  MA_CHART_CARDS_CONTAINER_ID,
  MA_CHART_MINI_PREFIX,
  MA_CHART_MINI_COUNT,
  MA_CHART_LAST_N_DAYS,
} from '../../lib/chart-constants';

/** 최근 N평일 합산 기준 상위 8명 client_id 반환 (제네릭) */
export function getTop8ClientIdsByLast5DaysSum<T>(
  rows: T[],
  getDate: (r: T) => string,
  getValue: (r: T) => number,
  getClientId: (r: T) => number
): number[] {
  const dates = [...new Set(rows.map(getDate))].sort().reverse();
  const lastNDates = new Set(dates.slice(0, MA_CHART_LAST_N_DAYS));

  const sumByClient = new Map<number, number>();
  for (const r of rows) {
    if (!lastNDates.has(getDate(r))) continue;
    const id = getClientId(r);
    sumByClient.set(id, (sumByClient.get(id) ?? 0) + getValue(r));
  }

  const sorted = [...sumByClient.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
  return sorted.slice(0, MA_CHART_MINI_COUNT);
}

/**
 * 광고주 8명 client_name 조회.
 * ads_data_client.client_id는 DB에서 string 타입이므로 쿼리 시 문자열로 전달.
 */
async function fetchClientNames(
  supabase: SupabaseClient,
  clientIds: number[]
): Promise<Map<number, string>> {
  if (clientIds.length === 0) return new Map();

  const idStrings = clientIds.map((id) => String(id));
  const { data, error } = await supabase
    .from('ads_data_client')
    .select('client_id, client_name')
    .in('client_id', idStrings);

  if (error || !data) return new Map();

  const map = new Map<number, string>();
  for (const row of data as { client_id: string; client_name: string | null }[]) {
    const id = Number(row.client_id);
    map.set(id, row.client_name ?? `Client ${row.client_id}`);
  }
  return map;
}

/** 차트 렌더 지연 호출용 (DOM 붙은 뒤 실행) */
interface PendingMiniChart {
  canvasId: string;
  series: MaChartSeries;
  tooltipContent: string;
}

export interface MaChartCardsGetters<T> {
  getDate: (r: T) => string;
  getValue: (r: T) => number;
  getMa: (r: T) => number;
  getGapPct: (r: T) => number | null;
  getClientId: (r: T) => number;
}

/**
 * 미니 카드 영역 렌더 — 2×4 미니 차트, 클릭 시 onClientSelect(clientId) 호출.
 * REV / vCTR / CVR / CPC 공통: getters로 행 타입 구분.
 * top8ClientIds를 넘기면 해당 순서로 8명 고정 (미니 차트 8명은 항상 매출 상위 8명 규칙).
 */
export async function renderMaChartCards<T>(
  rows: T[],
  getters: MaChartCardsGetters<T>,
  supabase: SupabaseClient,
  selectedClientId: number | null,
  onClientSelect: (clientId: number) => void,
  top8ClientIds?: number[]
): Promise<void> {
  const container = document.getElementById(MA_CHART_CARDS_CONTAINER_ID);
  if (!container) return;

  const { getDate, getValue, getMa, getGapPct, getClientId } = getters;
  const top8Ids =
    top8ClientIds != null && top8ClientIds.length > 0
      ? top8ClientIds
      : getTop8ClientIdsByLast5DaysSum(rows, getDate, getValue, getClientId);
  if (top8Ids.length === 0) {
    container.innerHTML = '<div class="MaChart__empty">데이터가 없습니다.</div>';
    return;
  }

  const nameMap = await fetchClientNames(supabase, top8Ids);

  container.innerHTML = '';
  container.classList.add('MaChart__cards-container--grid');

  const grid = document.createElement('div');
  grid.className = 'MaChart__mini-grid';

  const pendingCharts: PendingMiniChart[] = [];

  for (let i = 0; i < MA_CHART_MINI_COUNT; i++) {
    const cell = document.createElement('div');
    cell.className = 'MaChart__mini-cell';
    if (i < top8Ids.length) {
      const clientId = top8Ids[i];
      const isSelected = selectedClientId === clientId;
      if (isSelected) cell.classList.add('MaChart__mini-cell--selected');

      const canvasId = `${MA_CHART_MINI_PREFIX}${i}`;
      const canvas = document.createElement('canvas');
      canvas.id = canvasId;
      cell.appendChild(canvas);

      cell.setAttribute('data-client-id', String(clientId));
      cell.setAttribute('role', 'button');
      cell.setAttribute('tabindex', '0');
      cell.addEventListener('click', () => onClientSelect(clientId));
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClientSelect(clientId);
        }
      });

      const clientRows = rows
        .filter((r) => getClientId(r) === clientId)
        .sort((a, b) => getDate(a).localeCompare(getDate(b)));
      if (clientRows.length > 0) {
        const series = buildChartDataFromRows(
          clientRows,
          getDate,
          getValue,
          getMa,
          getGapPct
        );
        const clientName = nameMap.get(clientId) ?? `Client ${clientId}`;
        const displayName = clientName.length > 20 ? clientName.slice(0, 20) + '...' : clientName;
        pendingCharts.push({
          canvasId,
          series,
          tooltipContent: `${clientId}. ${displayName}`,
        });
      }

      grid.appendChild(cell);
    } else {
      cell.classList.add('MaChart__mini-cell--empty');
      grid.appendChild(cell);
    }
  }

  container.appendChild(grid);

  for (const { canvasId, series, tooltipContent } of pendingCharts) {
    renderMaMiniChart(canvasId, series, { tooltipContent });
  }
}

/**
 * 미니 차트 8개 및 툴팁 DOM 정리.
 */
export function cleanupMaChartCards(): void {
  for (let i = 0; i < MA_CHART_MINI_COUNT; i++) {
    const canvasId = `${MA_CHART_MINI_PREFIX}${i}`;
    chartRegistry.destroy(canvasId);
    const tooltip = document.getElementById(`tooltip-${canvasId}`);
    if (tooltip) tooltip.remove();
  }
}
