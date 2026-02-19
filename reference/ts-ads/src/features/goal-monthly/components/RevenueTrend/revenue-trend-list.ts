/**
 * Revenue Trend - 트렌드 리스트/탭
 */

import { formatNumberWithCommas } from '@shared/lib';
import type { TrendItem, TrendDirection } from './revenue-trend-types';
import { TREND_LIST_ID, COLOR_RED } from './revenue-trend-constants';

/**
 * 트렌드 카드 리스트 렌더링
 */
export function renderTrendList(items: TrendItem[], direction: TrendDirection): void {
  const container = document.getElementById(TREND_LIST_ID);
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="RevenueTrend__empty">데이터가 없습니다.</div>
    `;
    return;
  }

  const color = direction === 'up' ? COLOR_RED : '#3B82F6';

  container.innerHTML = items
    .map((item) => {
      const changeRateStr =
        item.changeRate >= 0
          ? `+${item.changeRate.toFixed(1)}%`
          : `${item.changeRate.toFixed(1)}%`;

      const changeAmountStr =
        item.changeAmount >= 0
          ? `+${formatNumberWithCommas(item.changeAmount)}`
          : formatNumberWithCommas(item.changeAmount);

      return `
        <div class="RevenueTrend__cardItem">
          <div class="RevenueTrend__cardItemInfo">
            <div class="RevenueTrend__cardItemName" title="${item.clientName}">
              ${item.clientName}
            </div>
            <div class="RevenueTrend__cardItemAmounts">
              ${formatNumberWithCommas(item.recentAmount)} / ${formatNumberWithCommas(item.previousAmount)}
            </div>
          </div>
          <div class="RevenueTrend__cardItemChange">
            <span class="RevenueTrend__cardItemRate" style="color: ${color}">
              ${changeRateStr}
            </span>
            <span class="RevenueTrend__cardItemAmountDiff" style="color: ${color}">
              ${changeAmountStr}
            </span>
          </div>
        </div>
      `;
    })
    .join('');
}

/**
 * 트렌드 탭 UI 업데이트
 */
export function updateTrendTabs(direction: TrendDirection): void {
  const upBtn = document.getElementById('revenue-trend-up-btn');
  const downBtn = document.getElementById('revenue-trend-down-btn');

  if (upBtn) {
    upBtn.className = `RevenueTrend__toggleBtn ${direction === 'up' ? 'active RevenueTrend__toggleBtn--up' : ''}`;
  }
  if (downBtn) {
    downBtn.className = `RevenueTrend__toggleBtn ${direction === 'down' ? 'active RevenueTrend__toggleBtn--down' : ''}`;
  }
}
