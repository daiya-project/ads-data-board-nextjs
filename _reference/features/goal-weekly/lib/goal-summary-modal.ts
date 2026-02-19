/**
 * Goal Detail Modal - 요약 모달
 */

import { getCachedElementById, formatNumberWithCommas, escapeHtml } from '@shared/lib';
import type { WeekSummary } from '@shared/types';

/**
 * 주간 요약 모달 열기
 */
export function openSummaryDetailModal(
  summary: WeekSummary,
  _previousWeekSummary: WeekSummary | null,
  category: string,
  categoryLabel: string
): void {
  let modal = getCachedElementById('summary-detail-modal') as HTMLElement | null;
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'summary-detail-modal';
    modal.className = 'Modal__overlay';
    modal.innerHTML = `
      <div class="Modal__container">
        <div class="Modal__header">
          <h2 class="Modal__title">요약 상세</h2>
          <button class="Modal__closeBtn" id="close-summary-detail-modal-btn">✕</button>
        </div>
        <div class="Modal__body" id="summary-detail-modal-body"></div>
      </div>
    `;
    document.body.appendChild(modal);
    const closeBtn = getCachedElementById('close-summary-detail-modal-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        (modal as HTMLElement).style.display = 'none';
      });
    }
    modal.addEventListener('click', (e: Event) => {
      if (e.target === modal) (modal as HTMLElement).style.display = 'none';
    });
  }

  let weekOverWeekRate = 0;
  if (summary.totalStartRevenue > 0) {
    weekOverWeekRate =
      (summary.totalCurrentRevenue / summary.totalStartRevenue - 1) * 100;
  }
  const targetGrowthAmount = summary.totalGoalRevenue - summary.totalStartRevenue;
  const growthSign = summary.growthAmount >= 0 ? '+' : '-';
  const targetGrowthSign = targetGrowthAmount >= 0 ? '+' : '';
  const weekOverWeekSign = weekOverWeekRate >= 0 ? '+' : '-';
  const startRevenueFormatted = formatNumberWithCommas(summary.totalStartRevenue);
  const growthAmountFormatted = formatNumberWithCommas(Math.abs(summary.growthAmount));
  const targetGrowthAmountFormatted = formatNumberWithCommas(Math.abs(targetGrowthAmount));
  const currentRevenueFormatted = formatNumberWithCommas(summary.totalCurrentRevenue);
  const goalRevenueFormatted = formatNumberWithCommas(summary.totalGoalRevenue);
  const weekOverWeekRateFormatted = Math.round(Math.abs(weekOverWeekRate));
  const achievementRateFormatted = Math.round(summary.achievementRate);
  const weekOverWeekBadgeClass =
    weekOverWeekRate >= 0 ? 'summary-badge-growth' : 'summary-badge-decline';
  let achievementBadgeClass = 'summary-badge-low';
  if (summary.achievementRate >= 100) achievementBadgeClass = 'summary-badge-high';

  const modalBody = getCachedElementById('summary-detail-modal-body');
  if (modalBody) {
    modalBody.innerHTML = `
      <div class="summary-card-detail goal-category-${category}">
        <div class="summary-card-detail-content">
          <span class="GoalCard__categoryBadge goal-category-${category}">${escapeHtml(categoryLabel)}</span>
          <div class="summary-detail-text">
            <span>${currentRevenueFormatted}</span> <span class="summary-text-muted">(${goalRevenueFormatted})</span> = <span>${startRevenueFormatted}</span> <span>${growthSign} ${growthAmountFormatted}</span> <span class="summary-text-muted">(${targetGrowthSign}${targetGrowthAmountFormatted})</span>
          </div>
          <div class="summary-rate-group">
            <span class="summary-rate-badge ${weekOverWeekBadgeClass}">전주 대비 ${weekOverWeekSign}${weekOverWeekRateFormatted}%</span>
            <span class="summary-rate-badge ${achievementBadgeClass}">목표 달성 ${achievementRateFormatted}%</span>
          </div>
        </div>
      </div>
    `;
  }
  (modal as HTMLElement).style.display = 'flex';
}

/**
 * 요약 섹션 토글
 */
export function toggleSummarySection(
  summarySection: HTMLElement | null,
  summaryBadge: HTMLElement | null
): void {
  if (!summarySection || !summaryBadge) return;
  const isExpanded = summarySection.classList.contains('expanded');
  if (isExpanded) {
    summarySection.classList.remove('expanded');
    summaryBadge.textContent = '▼';
  } else {
    summarySection.classList.add('expanded');
    summaryBadge.textContent = '▲';
  }
}
