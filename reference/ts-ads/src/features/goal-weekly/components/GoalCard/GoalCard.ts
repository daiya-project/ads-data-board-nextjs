/**
 * Goal Weekly Feature — 주간 목표 카드 렌더 (레거시 3col 뷰)
 */

import { CATEGORY_LABELS } from '@shared/lib';
import { createGoalCard, createSummaryCard } from './card';
import { openGoalDetailModal, toggleSummarySection } from '../../lib/goal-detail-modal';
import { handleActionItemStatusToggle } from '../../lib/action';
import { getWeeksForNavigation } from '../../lib/week-utils';
import type { WeekGroup, WeeklyGoalState } from '../../lib/types';
import type { WeekSummary } from '@shared/types';

export function renderGoalCards(
  container: HTMLElement,
  weeks: WeekGroup[],
  showSummary = false,
  state: WeeklyGoalState,
  handleWeekNavigation: (direction: 'prev' | 'next') => Promise<void>
): void {
  container.innerHTML = '';

  let displayWeeks = weeks;
  let columnConfig: Record<string, string> = { col1: '지난 주', col2: '이번 주', col3: '다음 주' };

  if (state.allWeeksData && state.allWeeksData.length > 0 && state.weekNavigationState) {
    const navResult = getWeeksForNavigation(state.allWeeksData, state.weekNavigationState);
    displayWeeks = navResult.weeks;
    columnConfig = navResult.columnConfig;
  }

  if (displayWeeks.length === 0) {
    container.innerHTML = '<p class="empty-state">등록된 목표가 없습니다.</p>';
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const currentMonday = new Date(today);
  currentMonday.setDate(diff);
  currentMonday.setHours(0, 0, 0, 0);

  const headerRow = document.createElement('div');
  headerRow.className = 'GoalsLayout__headerRowNew GoalsLayout__headerRow--3col';

  const col1Label = columnConfig.col1 ?? '지난 주';
  const col2Label = columnConfig.col2 ?? '이번 주';
  const col3Label = columnConfig.col3 ?? '다음 주';

  const isCol1Current = col1Label === '이번 주';
  const isCol2Current = col2Label === '이번 주';
  const isCol3Current = col3Label === '이번 주';

  headerRow.appendChild(createHeaderDiv('◀', col1Label, isCol1Current));
  headerRow.appendChild(createHeaderDiv('', col2Label, isCol2Current));
  headerRow.appendChild(createHeaderDiv('', col3Label, isCol3Current, '▶'));
  container.appendChild(headerRow);

  let summarySection: HTMLElement | null = null;
  if (showSummary) {
    const summaryDivider = document.createElement('div');
    summaryDivider.className = 'GoalsLayout__categoryDivider summary-divider';
    summaryDivider.innerHTML = `
      <span class="GoalsLayout__dividerLine"></span>
      <span class="GoalsLayout__dividerText summary-badge" id="summary-toggle-badge">요약</span>
      <span class="GoalsLayout__dividerLine"></span>
    `;
    container.appendChild(summaryDivider);
    summarySection = document.createElement('div');
    summarySection.className = 'summary-section';
    summarySection.id = 'summary-section';
    summarySection.style.display = 'none';
    container.appendChild(summarySection);
  }

  const categoryOrder = Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[];
  categoryOrder.forEach((category) => {
    const categoryGoalsByWeek = displayWeeks.map((week) =>
      week.goals.filter((goal) => (goal.goal_category || 'etc') === category)
    );
    const hasAnyGoals = categoryGoalsByWeek.some((goals) => goals.length > 0);

    if (hasAnyGoals) {
      const categoryDivider = document.createElement('div');
      categoryDivider.className = 'GoalsLayout__categoryDivider';
      categoryDivider.innerHTML = `<span class="GoalsLayout__dividerLine"></span><span class="GoalsLayout__dividerText GoalCard__categoryBadge goal-category-${category}">${CATEGORY_LABELS[category] ?? category}</span><span class="GoalsLayout__dividerLine"></span>`;
      container.appendChild(categoryDivider);

      const categoryRow = document.createElement('div');
      categoryRow.className = 'GoalsLayout__categoryRowNew GoalsLayout__categoryRow--3col';

      displayWeeks.forEach((_week, weekIndex) => {
        const weekColumn = document.createElement('div');
        weekColumn.className = 'GoalsLayout__weekColumnNew';
        const goalsInWeek = categoryGoalsByWeek[weekIndex] ?? [];
        const fragment = document.createDocumentFragment();
        goalsInWeek.forEach((goal) => {
          fragment.appendChild(createGoalCard(goal));
        });
        weekColumn.appendChild(fragment);
        categoryRow.appendChild(weekColumn);
      });

      container.appendChild(categoryRow);
    }
  });

  if (!container.hasAttribute('data-arrow-delegated')) {
    container.setAttribute('data-arrow-delegated', 'true');
    container.addEventListener('click', async (e) => {
      const arrow = (e.target as HTMLElement).closest('.WeekHeader__navArrow');
      if (arrow) {
        e.stopPropagation();
        (arrow as HTMLElement).style.cursor = 'pointer';
        const direction = arrow.classList.contains('WeekHeader__navArrow--left') ? 'prev' : 'next';
        await handleWeekNavigation(direction);
      }
    });
  }

  if (!container.hasAttribute('data-card-delegated')) {
    container.setAttribute('data-card-delegated', 'true');
    container.addEventListener('click', async (e) => {
      if ((e.target as HTMLElement).closest('.action-item-icon')) return;
      const card = (e.target as HTMLElement).closest('.GoalCard__root[data-goal-id]');
      if (card) {
        const goalId = card.getAttribute('data-goal-id');
        const goal = displayWeeks
          .flatMap((w) => w.goals)
          .find((g) => String(g.id) === goalId);
        if (goal) {
          openGoalDetailModal(goal, card as HTMLElement);
        }
      }
    });
  }

  if (!container.hasAttribute('data-action-delegated')) {
    container.setAttribute('data-action-delegated', 'true');
    container.addEventListener('click', async (e) => {
      const icon = (e.target as HTMLElement).closest('.action-item-icon');
      if (!icon) return;
      e.stopPropagation();
      const actionItemElement = (e.target as HTMLElement).closest('.GoalCard__action-item');
      if (actionItemElement) {
        const actionItemId = actionItemElement.getAttribute('data-action-item-id');
        const currentStatus =
          actionItemElement.getAttribute('data-status') ?? 'progress';
        const goalId = actionItemElement.getAttribute('data-goal-id');
        if (actionItemId && goalId) {
          await handleActionItemStatusToggle(
            parseInt(actionItemId, 10),
            currentStatus,
            parseInt(goalId, 10)
          );
        }
      }
    });
  }

  if (showSummary && summarySection) {
    renderSummarySection(summarySection, displayWeeks);
    const summaryBadge = document.getElementById('summary-toggle-badge');
    if (summaryBadge) {
      summaryBadge.addEventListener('click', () => {
        toggleSummarySection(summarySection!, summaryBadge);
      });
      summaryBadge.style.cursor = 'pointer';
    }
  }
}

function createHeaderDiv(
  leftArrow: string,
  text: string,
  isCurrent = false,
  rightArrow = ''
): HTMLElement {
  const div = document.createElement('div');
  div.className = isCurrent ? 'WeekHeader__rootNew current-week' : 'WeekHeader__rootNew';
  let inner = '';
  if (leftArrow)
    inner += `<i class="WeekHeader__navArrow WeekHeader__navArrow--left">${leftArrow}</i>`;
  inner += `<span class="WeekHeader__text">${text}</span>`;
  if (rightArrow)
    inner += `<i class="WeekHeader__navArrow WeekHeader__navArrow--right">${rightArrow}</i>`;
  div.innerHTML = inner;
  return div;
}

export function renderSummarySection(
  container: HTMLElement,
  weeks: WeekGroup[]
): void {
  if (!weeks || weeks.length === 0) {
    container.innerHTML = '<p class="empty-state">요약 데이터가 없습니다.</p>';
    return;
  }

  const categoryOrder = Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[];

  categoryOrder.forEach((category) => {
    const categorySummaryByWeek = weeks.map((week) => {
      const categoryGoals = week.goals.filter(
        (goal) => (goal.goal_category || 'etc') === category
      );
      let totalStartRevenue = 0;
      let totalGoalRevenue = 0;
      let totalCurrentRevenue = 0;
      categoryGoals.forEach((goal) => {
        totalStartRevenue += goal.start_revenue ?? 0;
        totalGoalRevenue += goal.goal_revenue ?? 0;
        totalCurrentRevenue += goal.currentRevenue ?? 0;
      });
      const growthAmount = totalCurrentRevenue - totalStartRevenue;
      const growthRate =
        totalStartRevenue > 0 ? (growthAmount / totalStartRevenue) * 100 : 0;
      const achievementRate =
        totalGoalRevenue > 0 ? (totalCurrentRevenue / totalGoalRevenue) * 100 : 0;
      return {
        category,
        totalStartRevenue,
        totalGoalRevenue,
        totalCurrentRevenue,
        growthAmount,
        growthRate,
        achievementRate,
        hasData: categoryGoals.length > 0,
      };
    });

    const hasAnyData = categorySummaryByWeek.some((s) => s.hasData);
    if (hasAnyData) {
      const categoryContainer = document.createElement('div');
      categoryContainer.className = 'summary-category-container';
      categoryContainer.style.setProperty('--week-count', String(weeks.length));
      categoryContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';

      weeks.forEach((week, weekIndex) => {
        const summaryColumn = document.createElement('div');
        summaryColumn.className = 'week-column-new';
        const summary = categorySummaryByWeek[weekIndex];
        const currentWeekStartDate = new Date(week.startDate);
        const previousWeekStartDate = new Date(currentWeekStartDate);
        previousWeekStartDate.setDate(previousWeekStartDate.getDate() - 7);
        previousWeekStartDate.setHours(0, 0, 0, 0);
        let previousWeekSummary: (typeof categorySummaryByWeek)[0] | null = null;
        for (let i = 0; i < weeks.length; i++) {
          if (i === weekIndex) continue;
          const otherWeekStartDate = new Date(weeks[i].startDate);
          otherWeekStartDate.setHours(0, 0, 0, 0);
          if (
            otherWeekStartDate.getTime() === previousWeekStartDate.getTime()
          ) {
            previousWeekSummary = categorySummaryByWeek[i];
            break;
          }
        }
        if (summary?.hasData) {
          const weekSummary: WeekSummary = {
            totalStartRevenue: summary.totalStartRevenue,
            totalCurrentRevenue: summary.totalCurrentRevenue,
            totalGoalRevenue: summary.totalGoalRevenue,
            growthAmount: summary.growthAmount,
            achievementRate: summary.achievementRate,
          };
          const prevWeekSummary: WeekSummary | null = previousWeekSummary
            ? {
                totalStartRevenue: previousWeekSummary.totalStartRevenue,
                totalCurrentRevenue: previousWeekSummary.totalCurrentRevenue,
                totalGoalRevenue: previousWeekSummary.totalGoalRevenue,
                growthAmount: previousWeekSummary.growthAmount,
                achievementRate: previousWeekSummary.achievementRate,
              }
            : null;
          const summaryCard = createSummaryCard(
            weekSummary,
            prevWeekSummary,
            category,
            CATEGORY_LABELS[category],
            weekIndex
          );
          summaryColumn.appendChild(summaryCard);
        }
        categoryContainer.appendChild(summaryColumn);
      });
      container.appendChild(categoryContainer);
    }
  });
}
