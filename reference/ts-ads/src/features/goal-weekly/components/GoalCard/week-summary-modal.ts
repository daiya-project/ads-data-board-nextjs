/**
 * Goal Weekly Feature — 주간 목표 요약 모달
 */

import { getSupabaseClientSafe } from '@shared/api';
import { formatNumberWithCommas, calculateGoalMetrics, CATEGORY_LABELS } from '@shared/lib';
import type { GoalWithRevenue } from '@shared/types';

export interface WeekInfoForModal {
  startDate: string | Date;
  endDate: string | Date;
  week_id?: string;
}

interface CategorySummary {
  count: number;
  startRevenue: number;
  goalRevenue: number;
  currentRevenue: number;
  difference: number;
  achievementRate: number;
  growthRate: number;
}

interface ActionItemsSummary {
  total: number;
  done: number;
  inProgress: number;
  failed: number;
}

export async function openWeekSummaryModal(
  goals: GoalWithRevenue[],
  weekInfo: WeekInfoForModal,
  managerName: string | null = null
): Promise<void> {
  if (!goals || goals.length === 0) return;

  const modal = createSummaryModalElement();
  document.body.appendChild(modal);

  const summary = await calculateWeekSummary(goals);
  renderSummaryContent(modal, summary, weekInfo, managerName);
  modal.style.display = 'flex';
  setupCloseEvents(modal);
}

function createSummaryModalElement(): HTMLElement {
  const modal = document.createElement('div');
  modal.className = 'week-summary-modal';
  modal.innerHTML = `
    <div class="week-summary-modal__overlay"></div>
    <div class="week-summary-modal__container">
      <div class="week-summary-modal__header">
        <h2 class="week-summary-modal__title">주간 목표 요약</h2>
        <button class="week-summary-modal__close-btn">
          <i class="ri-close-line"></i>
        </button>
      </div>
      <div class="week-summary-modal__body"></div>
    </div>
  `;
  return modal;
}

async function calculateWeekSummary(goals: GoalWithRevenue[]): Promise<{
  categories: Record<string, CategorySummary>;
  actionItems: ActionItemsSummary;
}> {
  const orderedKeys = Object.keys(CATEGORY_LABELS);
  const groupedGoals: Record<string, GoalWithRevenue[]> = {};
  for (const key of orderedKeys) {
    groupedGoals[key] = [];
  }
  goals.forEach((goal) => {
    const category = (goal.goal_category as string) || 'etc';
    if (groupedGoals[category]) {
      groupedGoals[category].push(goal);
    } else {
      if (!groupedGoals.etc) groupedGoals.etc = [];
      groupedGoals.etc.push(goal);
    }
  });

  const categories: Record<string, CategorySummary> = {};
  for (const key of orderedKeys) {
    categories[key] = await calculateCategorySummary(groupedGoals[key] ?? []);
  }
  const actionItems = await calculateActionItemsSummary(goals);
  return { categories, actionItems };
}

async function calculateCategorySummary(goals: GoalWithRevenue[]): Promise<CategorySummary> {
  if (!goals || goals.length === 0) {
    return {
      count: 0,
      startRevenue: 0,
      goalRevenue: 0,
      currentRevenue: 0,
      difference: 0,
      achievementRate: 0,
      growthRate: 0,
    };
  }
  let totalStartRevenue = 0;
  let totalGoalRevenue = 0;
  let totalCurrentRevenue = 0;
  for (const goal of goals) {
    const metrics = calculateGoalMetrics(goal);
    totalStartRevenue += metrics.startRevenue;
    totalGoalRevenue += metrics.goalRevenue;
    totalCurrentRevenue += metrics.currentRevenue;
  }
  const difference = totalCurrentRevenue - totalStartRevenue;
  const achievementRate =
    totalGoalRevenue > 0 ? Math.round((totalCurrentRevenue / totalGoalRevenue) * 100 * 10) / 10 : 0;
  const growthRate =
    totalStartRevenue > 0 ? Math.round((difference / totalStartRevenue) * 100 * 10) / 10 : 0;
  return {
    count: goals.length,
    startRevenue: totalStartRevenue,
    goalRevenue: totalGoalRevenue,
    currentRevenue: totalCurrentRevenue,
    difference,
    achievementRate,
    growthRate,
  };
}

async function calculateActionItemsSummary(goals: GoalWithRevenue[]): Promise<ActionItemsSummary> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return { total: 0, done: 0, inProgress: 0, failed: 0 };
  const goalIds = goals.map((g) => g.id);
  const { data: actionItems, error } = await supabase
    .from('ads_data_goal_actionitem')
    .select('status')
    .in('goal_id', goalIds);
  if (error || !actionItems) return { total: 0, done: 0, inProgress: 0, failed: 0 };
  const summary = { total: actionItems.length, done: 0, inProgress: 0, failed: 0 };
  (actionItems as { status: string }[]).forEach((item) => {
    if (item.status === 'done') summary.done++;
    else if (item.status === 'failed') summary.failed++;
    else summary.inProgress++;
  });
  return summary;
}

function renderSummaryContent(
  modal: HTMLElement,
  summary: { categories: Record<string, CategorySummary>; actionItems: ActionItemsSummary },
  weekInfo: WeekInfoForModal,
  managerName: string | null
): void {
  const body = modal.querySelector('.week-summary-modal__body');
  if (!body) return;
  const startDateStr = weekInfo.startDate ? formatDateShort(weekInfo.startDate) : '';
  const endDateStr = weekInfo.endDate ? formatDateShort(weekInfo.endDate) : '';
  const weekLabel = `${startDateStr} - ${endDateStr}`;
  const managerLabel = managerName ?? '전체 매니저';
  const orderedKeys = Object.keys(CATEGORY_LABELS);
  let contentHTML = `
    <div class="week-summary-modal__info">
      <div class="week-summary-modal__info-item">
        <span class="week-summary-modal__info-label">대상 주차:</span>
        <span class="week-summary-modal__info-value">${weekLabel}</span>
      </div>
      <div class="week-summary-modal__info-item">
        <span class="week-summary-modal__info-label">담당자:</span>
        <span class="week-summary-modal__info-value">${managerLabel}</span>
      </div>
    </div>
    <div class="week-summary-modal__divider"></div>
  `;
  orderedKeys.forEach((category) => {
    const data = summary.categories[category];
    if (!data) return;
    const categoryLabel = CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category;
    contentHTML += renderCategorySection(category, categoryLabel, data);
  });
  contentHTML += `<div class="week-summary-modal__divider"></div>`;
  contentHTML += renderActionItemsSection(summary.actionItems);
  (body as HTMLElement).innerHTML = contentHTML;
}

function renderCategorySection(
  category: string,
  label: string,
  data: CategorySummary
): string {
  const differenceSign = data.difference >= 0 ? '+' : '-';
  const growthRateSign = data.growthRate >= 0 ? '+' : '-';
  const differenceClass = data.difference >= 0 ? 'positive' : 'negative';
  const achievementClass = data.achievementRate >= 100 ? 'high' : 'low';
  const growthClass = data.growthRate >= 0 ? 'positive' : 'negative';
  return `
    <div class="week-summary-section">
      ${data.count > 0 ? `
        <div class="week-summary-section__main-line">
          <div class="week-summary-section__left">
            <span class="goal-category-badge goal-category-${category}">${label}</span>
            <span class="week-summary-section__count">${data.count} Action Item</span>
          </div>
          <div class="week-summary-section__right">
            <span class="week-summary-metric__revenue">
              ${formatNumberWithCommas(data.startRevenue)}원 <i class="ri-arrow-right-line week-summary-arrow"></i> ${formatNumberWithCommas(data.goalRevenue)}원 <span class="week-summary-divider">|</span> ${formatNumberWithCommas(data.currentRevenue)}원
            </span>
            <span class="week-summary-metric__diff ${differenceClass}">${differenceSign}${formatNumberWithCommas(Math.abs(data.difference))}원</span>
          </div>
        </div>
        <div class="week-summary-section__body">
          <div class="week-summary-rates">
            <span class="week-summary-rate-badge week-summary-rate-badge--${achievementClass}">달성률 ${data.achievementRate}%</span>
            <span class="week-summary-rate-divider">|</span>
            <span class="week-summary-rate-badge week-summary-rate-badge--${growthClass}">성장률 ${growthRateSign}${Math.abs(data.growthRate)}%</span>
          </div>
        </div>
      ` : `
        <div class="week-summary-section__main-line">
          <div class="week-summary-section__left">
            <span class="goal-category-badge goal-category-${category}">${label}</span>
            <span class="week-summary-section__empty">0 Action Item</span>
          </div>
        </div>
      `}
    </div>
  `;
}

function renderActionItemsSection(actionItems: ActionItemsSummary): string {
  return `
    <div class="week-summary-section">
      <div class="week-summary-section__header">
        <span class="week-summary-section__title">액션 아이템</span>
      </div>
      <div class="week-summary-section__body">
        <div class="week-summary-action-items">
          <div class="week-summary-action-item">
            <span class="week-summary-action-item__label">총</span>
            <span class="week-summary-action-item__value">${actionItems.total}개</span>
          </div>
          <div class="week-summary-action-item">
            <span class="week-summary-action-item__label">완료</span>
            <span class="week-summary-action-item__value week-summary-action-item__value--done">${actionItems.done}개</span>
          </div>
          <div class="week-summary-action-item">
            <span class="week-summary-action-item__label">진행 중</span>
            <span class="week-summary-action-item__value week-summary-action-item__value--progress">${actionItems.inProgress}개</span>
          </div>
          <div class="week-summary-action-item">
            <span class="week-summary-action-item__label">실패</span>
            <span class="week-summary-action-item__value week-summary-action-item__value--failed">${actionItems.failed}개</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function formatDateShort(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${month}.${day}`;
}

function setupCloseEvents(modal: HTMLElement): void {
  const closeBtn = modal.querySelector('.week-summary-modal__close-btn');
  const overlay = modal.querySelector('.week-summary-modal__overlay');
  const closeModal = () => {
    modal.style.display = 'none';
    setTimeout(() => modal.remove(), 300);
  };
  closeBtn?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', closeModal);
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleKeyDown);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
}
