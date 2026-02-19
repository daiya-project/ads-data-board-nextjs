/**
 * Goal > Monthly — 매출 변화량 차트 + 증감 광고주 카드 리스트
 *
 * 메인 조합 로직 및 공개 API
 */

import { getSupabaseClientSafe } from '@shared/api';
import { chartRegistry, devLog } from '@shared/lib';
import type { ClientDailyData } from './revenue-trend-types';
import type { TrendDirection } from './revenue-trend-types';
import { CANVAS_ID, TREND_LIST_ID } from './revenue-trend-constants';
import {
  fetchDailyRevenueData,
  enrichClientNames,
  calculateDailyTotals,
  calculateDailyChanges,
  calculateTrendList,
} from './revenue-trend-data';
import { renderTrendChart } from './revenue-trend-chart';
import { renderTrendList, updateTrendTabs } from './revenue-trend-list';

/* ---------- 상태 ---------- */

let currentTrendDirection: TrendDirection = 'down';
let cachedDates: string[] = [];
let cachedClientDataMap: Map<number, ClientDailyData> = new Map();

/* ---------- HTML 구조 ---------- */

function createSectionHTML(): string {
  return `
    <div class="RevenueTrend__section">
      <div class="RevenueTrend__grid">
        <div class="RevenueTrend__chartArea">
          <div class="RevenueTrend__chartHeader">
            <h4 class="RevenueTrend__title">
              <span class="RevenueTrend__dot"></span>
              매출 변화량
            </h4>
          </div>
          <div class="RevenueTrend__chartWrapper">
            <canvas id="${CANVAS_ID}"></canvas>
          </div>
        </div>

        <div class="RevenueTrend__listArea">
          <div class="RevenueTrend__listHeader">
            <h4 class="RevenueTrend__title">
              <span class="RevenueTrend__dot"></span>
              증감 광고주
            </h4>
            <div class="RevenueTrend__toggle">
              <button id="revenue-trend-up-btn" class="RevenueTrend__toggleBtn">상승</button>
              <span class="RevenueTrend__toggleDivider">|</span>
              <button id="revenue-trend-down-btn" class="RevenueTrend__toggleBtn active RevenueTrend__toggleBtn--down">하락</button>
            </div>
          </div>
          <div id="${TREND_LIST_ID}" class="RevenueTrend__listContainer">
            <div class="RevenueTrend__empty">데이터 로딩 중...</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ---------- 방향 전환 ---------- */

function switchTrendDirection(direction: TrendDirection): void {
  currentTrendDirection = direction;
  updateTrendTabs(direction);

  if (cachedDates.length > 0) {
    const trendItems = calculateTrendList(cachedDates, cachedClientDataMap, direction);
    renderTrendList(trendItems, direction);
  }
}

function setupTrendToggleListeners(): void {
  const upBtn = document.getElementById('revenue-trend-up-btn');
  const downBtn = document.getElementById('revenue-trend-down-btn');

  if (upBtn) {
    upBtn.addEventListener('click', () => switchTrendDirection('up'));
  }
  if (downBtn) {
    downBtn.addEventListener('click', () => switchTrendDirection('down'));
  }
}

/* ---------- 공개 API ---------- */

/**
 * 매출 변화량 섹션 렌더링 (진입점)
 */
export async function renderRevenueTrendSection(
  containerId: string,
  selectedMonth: string,
  managerId: number | null
): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) return;

  const supabase = getSupabaseClientSafe();
  if (!supabase) return;

  container.innerHTML = createSectionHTML();
  setupTrendToggleListeners();

  try {
    const { dates, clientDataMap } = await fetchDailyRevenueData(
      supabase,
      managerId,
      selectedMonth
    );

    if (dates.length === 0) {
      const listEl = document.getElementById(TREND_LIST_ID);
      if (listEl) listEl.innerHTML = '<div class="RevenueTrend__empty">데이터가 없습니다.</div>';
      return;
    }

    await enrichClientNames(supabase, clientDataMap);

    cachedDates = dates;
    cachedClientDataMap = clientDataMap;

    const dailyTotals = calculateDailyTotals(dates, clientDataMap);
    const dailyChanges = calculateDailyChanges(dailyTotals);
    renderTrendChart(dates, dailyTotals, dailyChanges);

    currentTrendDirection = 'down';
    updateTrendTabs('down');
    const trendItems = calculateTrendList(dates, clientDataMap, 'down');
    renderTrendList(trendItems, 'down');

    devLog('[RevenueTrend] 렌더링 완료');
  } catch (err) {
    devLog('[RevenueTrend] 오류:', err);
  }
}

/**
 * 섹션 정리
 */
export function cleanupRevenueTrendSection(): void {
  chartRegistry.destroy(CANVAS_ID);
  cachedDates = [];
  cachedClientDataMap = new Map();

  const tooltip = document.getElementById(`tooltip-${CANVAS_ID}`);
  if (tooltip) tooltip.remove();
}
