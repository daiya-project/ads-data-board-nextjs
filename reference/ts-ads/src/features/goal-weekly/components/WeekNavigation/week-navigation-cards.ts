/**
 * Goal Weekly — 주간 네비게이션 카드 렌더링 및 카드/헤더 이벤트
 */

import { getSupabaseClientSafe } from '@shared/api';
import { CATEGORY_ORDER } from '@shared/lib';
import { weekNavigationState, getLayoutConfig, getWeekData } from './navigation-state';
import { createGoalCard } from '../GoalCard/card';
import { openGoalDetailModal } from '../../lib/goal-detail-modal';
import { handleActionItemStatusToggle } from '../../lib/action';
import { openWeekSummaryModal } from '../GoalCard/week-summary-modal';
import type { GoalWithRevenue } from '../../lib/types';

const ORDERED_CATEGORIES = Object.keys(CATEGORY_ORDER).sort(
  (a, b) => (CATEGORY_ORDER[a] ?? 999) - (CATEGORY_ORDER[b] ?? 999)
);

const actionItemsCache = new Map<number, { data: unknown[]; ts: number }>();
const ACTION_ITEMS_CACHE_TTL = 5 * 60 * 1000;

export function groupGoalsByCategory(goals: GoalWithRevenue[]): Record<string, GoalWithRevenue[]> {
  const grouped: Record<string, GoalWithRevenue[]> = {};
  for (const key of ORDERED_CATEGORIES) {
    grouped[key] = [];
  }
  goals.forEach((goal) => {
    const category = (goal.goal_category as string) || 'etc';
    if (grouped[category]) {
      grouped[category].push(goal);
    } else {
      if (!grouped.etc) grouped.etc = [];
      grouped.etc.push(goal);
    }
  });
  return grouped;
}

export async function createCategorySection(
  category: string,
  goals: GoalWithRevenue[]
): Promise<HTMLElement> {
  const section = document.createElement('div');
  section.className = 'WeekNavigation__categorySection';
  section.setAttribute('data-category', category);
  const content = document.createElement('div');
  content.className = 'WeekNavigation__categoryContent';

  const goalsNeedingItems = goals.filter(
    (g) => !g.actionItems || g.actionItems.length === 0
  );
  if (goalsNeedingItems.length > 0) {
    await batchLoadActionItems(goalsNeedingItems);
  }

  for (const goal of goals) {
    try {
      const card = createGoalCard(goal);
      content.appendChild(card);
    } catch (error) {
      console.error(`[createCategorySection] goal ${goal.id}:`, error);
    }
  }
  section.appendChild(content);
  return section;
}

export async function batchLoadActionItems(goals: GoalWithRevenue[]): Promise<void> {
  const now = Date.now();
  const uncachedGoals: GoalWithRevenue[] = [];
  for (const goal of goals) {
    const cached = actionItemsCache.get(goal.id);
    if (cached && now - cached.ts < ACTION_ITEMS_CACHE_TTL) {
      goal.actionItems = cached.data as typeof goal.actionItems;
    } else {
      uncachedGoals.push(goal);
    }
  }

  if (uncachedGoals.length === 0) return;

  const supabase = getSupabaseClientSafe();
  if (!supabase) return;

  const goalIds = uncachedGoals.map((g) => g.id);
  const result = await (supabase
    .from('ads_data_goal_actionitem')
    .select('goal_id, id, action_item, status, done_memo')
    .in('goal_id', goalIds)
    .order('id', { ascending: true }) as unknown as Promise<{ data: { goal_id: number; id: number; action_item: string; status: string; done_memo?: string | null }[] | null; error: unknown }>);

  if (result.error || !result.data) return;

  const grouped = new Map<number, typeof result.data>();
  for (const item of result.data) {
    if (!grouped.has(item.goal_id)) grouped.set(item.goal_id, []);
    grouped.get(item.goal_id)!.push(item);
  }

  for (const goal of uncachedGoals) {
    const items = grouped.get(goal.id) ?? [];
    goal.actionItems = items as typeof goal.actionItems;
    actionItemsCache.set(goal.id, { data: items, ts: now });
  }
}

export function invalidateActionItemsCache(goalId?: number): void {
  if (goalId != null) {
    actionItemsCache.delete(goalId);
  } else {
    actionItemsCache.clear();
  }
}

export async function renderWeekCards(
  container: HTMLElement | null,
  _currentManagerId: number | null
): Promise<void> {
  if (!container) return;
  const config = getLayoutConfig(weekNavigationState.offset);
  for (const weekConfig of config.weeks) {
    const weekData = getWeekData(weekConfig.offset);
    const cardContainer = container.querySelector(
      `.WeekNavigation__cardContainer[data-week-offset="${weekConfig.offset}"]`
    );
    if (!cardContainer) continue;
    cardContainer.innerHTML = '';

    if (!weekData || !weekData.goals || weekData.goals.length === 0) {
      const emptyCard = document.createElement('div');
      emptyCard.className = 'EmptyWeekCard__root';
      emptyCard.innerHTML = `
        <div class="empty-card-icon"><i class="ri-inbox-line"></i></div>
        <div class="empty-card-title">등록된 목표가 없습니다</div>
        <div class="empty-card-description">새로운 주간 목표를 등록해보세요</div>
      `;
      cardContainer.appendChild(emptyCard);
    } else {
      const groupedGoals = groupGoalsByCategory(weekData.goals);
      for (const category of ORDERED_CATEGORIES) {
        const goals = groupedGoals[category] ?? [];
        if (goals.length === 0) continue;
        const section = await createCategorySection(category, goals);
        cardContainer.appendChild(section);
      }
    }
  }
  setupCardEvents(container);
  setupWeekHeaderEvents(container);
}

let cardClickHandler: ((e: MouseEvent) => void) | null = null;
let actionItemClickHandler: ((e: MouseEvent) => void) | null = null;
let weekHeaderClickHandler: ((e: MouseEvent) => void) | null = null;

export function setupCardEvents(container: HTMLElement): void {
  if (!container) return;
  if (cardClickHandler) container.removeEventListener('click', cardClickHandler);
  if (actionItemClickHandler) container.removeEventListener('click', actionItemClickHandler);

  cardClickHandler = async (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('.GoalCard__action-item')) return;
    const card = (e.target as HTMLElement).closest('.GoalCard__root');
    if (!card) return;
    const goalId = card.getAttribute('data-goal-id');
    if (!goalId) return;
    const supabase = getSupabaseClientSafe();
    if (!supabase) return;
    const { data: goal, error } = await supabase
      .from('ads_data_goal')
      .select('*')
      .eq('id', goalId)
      .single();
    if (error || !goal) return;
    await openGoalDetailModal(goal as GoalWithRevenue, card as HTMLElement);
  };

  actionItemClickHandler = async (e: MouseEvent) => {
    const actionItem = (e.target as HTMLElement).closest('.GoalCard__action-item');
    if (!actionItem) return;
    e.stopPropagation();
    const actionItemId = actionItem.getAttribute('data-action-item-id');
    const currentStatus = actionItem.getAttribute('data-status');
    const goalId = actionItem.getAttribute('data-goal-id');
    if (!actionItemId || !currentStatus || !goalId) return;
    await handleActionItemStatusToggle(
      parseInt(actionItemId, 10),
      currentStatus,
      parseInt(goalId, 10)
    );
  };

  container.addEventListener('click', cardClickHandler);
  container.addEventListener('click', actionItemClickHandler);
}

export function setupWeekHeaderEvents(container: HTMLElement): void {
  if (!container) return;
  if (weekHeaderClickHandler) container.removeEventListener('click', weekHeaderClickHandler);

  weekHeaderClickHandler = async (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('.WeekHeader__navArrow')) return;
    if ((e.target as HTMLElement).closest('.WeekHeader__cloneBtn')) return;
    const weekHeader = (e.target as HTMLElement).closest('.WeekHeader__root');
    if (!weekHeader) return;
    const weekOffset = parseInt(weekHeader.getAttribute('data-week-offset') ?? '', 10);
    if (isNaN(weekOffset)) return;
    const weekData = getWeekData(weekOffset);
    if (!weekData) return;
    const activeManagerTab = document.querySelector('.manager-tab.active');
    let managerName: string | null = null;
    if (activeManagerTab && !activeManagerTab.classList.contains('manager-tab--all')) {
      managerName = activeManagerTab.textContent?.trim() ?? null;
    }
    await openWeekSummaryModal(
      weekData.goals ?? [],
      {
        startDate: weekData.startDate,
        endDate: weekData.endDate ?? weekData.startDate,
        week_id: weekData.week_id,
      },
      managerName
    );
  };

  container.addEventListener('click', weekHeaderClickHandler);
}
