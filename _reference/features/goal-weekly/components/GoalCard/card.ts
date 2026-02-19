/**
 * 목표 카드 컴포넌트 (Phase 5c: components/goals/card.ts → feature GoalCard)
 */

import {
  formatNumberWithCommas,
  formatDateForHeader,
  calculateGoalMetrics,
  getMetricColorClasses,
  CATEGORY_LABELS,
  escapeHtml,
} from '@shared/lib';
import { openSummaryDetailModal } from '../../lib/goal-detail-modal';
import type { GoalWithRevenue } from '@shared/types';
import type { GoalMetricsResult } from '@shared/types';
import type { WeekSummary } from '@shared/types';
import type { CategoryKey } from '@shared/types';

export function createGoalCard(goal: GoalWithRevenue): HTMLElement {
  const metrics = calculateGoalMetrics(goal);
  const {
    achievementRateDecimal,
    startRevenue,
    goalRevenue,
    currentRevenue,
    targetGrowth,
    actualGrowth,
    growthRate,
    growthRatePercent,
  } = metrics;

  const categoryClass = `goal-category-${goal.goal_category ?? 'etc'}`;
  const categoryLabel =
    CATEGORY_LABELS[goal.goal_category as CategoryKey] ?? goal.goal_category ?? '기타';
  const colorClasses = getMetricColorClasses(goal, metrics);

  const targetInfo = goal.targetClientsInfo ?? { clientNames: [], totalCount: 0 };
  const clientNames = targetInfo.clientNames ?? [];
  const totalCount = targetInfo.totalCount ?? 0;

  const growthRateSign = growthRatePercent >= 0 ? '+' : '';
  const targetGrowthSign = targetGrowth >= 0 ? '+' : '';
  const descriptionText = `기존 매출 <strong>${formatNumberWithCommas(startRevenue)}</strong>원을 <strong>${growthRateSign}${growthRatePercent}%</strong> / <strong>${targetGrowthSign}${formatNumberWithCommas(targetGrowth)}</strong>원 하여 <strong>${formatNumberWithCommas(goalRevenue)}</strong>원을 달성 한다.`;

  const startDateStr = goal.start_date ? formatDateForHeader(goal.start_date) : '';
  const endDateStr = goal.end_date ? formatDateForHeader(goal.end_date) : '';
  const dateRangeStr = startDateStr && endDateStr ? `${startDateStr} - ${endDateStr}` : '';

  const card = document.createElement('div');
  card.className = `GoalCard__root ${categoryClass}`.trim();
  card.setAttribute('data-goal-id', String(goal.id));

  card.innerHTML = `
        <div class="GoalCard__header">
            <div class="GoalCard__header-left">
                <span class="goal-category-badge goal-category-${goal.goal_category ?? 'etc'}">${escapeHtml(categoryLabel)}</span>
                <span class="GoalCard__objective GoalCard__objective--compact">${escapeHtml(goal.memo ?? '목표 설명 없음')}</span>
            </div>
            ${dateRangeStr ? `<span class="GoalCard__date-range">${escapeHtml(dateRangeStr)}</span>` : ''}
        </div>
        <div class="GoalCard__description GoalCard__description--compact" style="--achievement-rate: ${achievementRateDecimal}">
            ${descriptionText}
        </div>
        <div class="GoalCard__body GoalCard__body--simple">
            <div class="GoalCard__body-left">
                <div class="GoalCard__metrics">
                    <div class="GoalCard__metric-group">
                        <div class="GoalCard__metric-row">
                            <div class="GoalCard__metric-item GoalCard__metric-item--target">
                                <span class="GoalCard__metric-label">목표매출</span>
                                <span class="GoalCard__metric-value">${formatNumberWithCommas(goalRevenue)}</span>
                            </div>
                            <div class="GoalCard__metric-item GoalCard__metric-item--achieved ${colorClasses.achievedRevenueClass}">
                                <span class="GoalCard__metric-label">달성매출</span>
                                <span class="GoalCard__metric-value">${formatNumberWithCommas(currentRevenue)}</span>
                            </div>
                        </div>
                        <div class="GoalCard__metric-row">
                            <div class="GoalCard__metric-item GoalCard__metric-item--target">
                                <span class="GoalCard__metric-label">목표 성장치</span>
                                <span class="GoalCard__metric-value">${targetGrowthSign}${formatNumberWithCommas(targetGrowth)}</span>
                            </div>
                            <div class="GoalCard__metric-item ${colorClasses.achievedGrowthClass}">
                                <span class="GoalCard__metric-label">달성 성장치</span>
                                <span class="GoalCard__metric-value">${actualGrowth >= 0 ? '+' : ''}${formatNumberWithCommas(actualGrowth)}</span>
                            </div>
                        </div>
                        <div class="GoalCard__metric-row">
                            <div class="GoalCard__rate-item ${colorClasses.weeklyGrowthClass}">
                                <span class="GoalCard__rate-label">주간 매출 성장률</span>
                                <span class="GoalCard__rate-value">${growthRate >= 0 ? '+' : ''}${growthRate}%</span>
                            </div>
                            <div class="GoalCard__rate-item ${colorClasses.goalAchievementClass}">
                                <span class="GoalCard__rate-label">목표 달성율</span>
                                <span class="GoalCard__rate-value">${achievementRateDecimal}%</span>
                            </div>
                        </div>
                        <div class="GoalCard__clients">
                            <div class="GoalCard__section-title">
                                <i class="ri-focus-2-line"></i>
                                <span>타겟 클라이언트</span>
                            </div>
                            <div class="GoalCard__clients-list">
                                ${totalCount === 0 ? '<div class="GoalCard__empty-state">타겟 광고주 없음</div>' : `<div class="GoalCard__client-item"><i class="ri-building-4-line"></i><span>${clientNames.map(escapeHtml).join(', ')}${totalCount >= 4 ? ' 등' : ''} 총 ${totalCount}개</span></div>`}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
  return card;
}

export function createSummaryCard(
  summary: WeekSummary,
  _previousWeekSummary: WeekSummary | null,
  category: string,
  categoryLabel: string,
  _weekIndex: number
): HTMLElement {
  const card = document.createElement('div');
  card.className = `GoalCard__root summary-card-preview goal-category-${category}`;

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
  else if (summary.achievementRate >= 80) achievementBadgeClass = 'summary-badge-mid';

  card.dataset.summaryData = JSON.stringify({
    categoryLabel,
    startRevenue: summary.totalStartRevenue,
    growthAmount: summary.growthAmount,
    targetGrowthAmount,
    currentRevenue: summary.totalCurrentRevenue,
    goalRevenue: summary.totalGoalRevenue,
    weekOverWeekRate,
    achievementRate: summary.achievementRate,
    growthSign,
    targetGrowthSign,
    weekOverWeekSign,
  });

  card.innerHTML = `
        <div class="summary-card-preview-content">
            <span class="goal-category-badge goal-category-${category}">${escapeHtml(categoryLabel)}</span>
            <span class="summary-text-main"> : ${currentRevenueFormatted} <span class="summary-text-muted">(${goalRevenueFormatted})</span> = ${startRevenueFormatted} ${growthSign} ${growthAmountFormatted} <span class="summary-text-muted">(${targetGrowthSign}${targetGrowthAmountFormatted})</span></span>
            <span class="summary-rate-group">
                <span class="summary-rate-badge ${weekOverWeekBadgeClass}">${weekOverWeekSign}${weekOverWeekRateFormatted}%</span>
                <span class="summary-rate-badge ${achievementBadgeClass}">${achievementRateFormatted}%</span>
            </span>
        </div>
    `;

  card.style.cursor = 'pointer';
  card.addEventListener('click', () => {
    openSummaryDetailModal(summary, _previousWeekSummary, category, categoryLabel);
  });

  return card;
}
