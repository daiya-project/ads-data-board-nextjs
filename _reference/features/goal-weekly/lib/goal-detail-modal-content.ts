/**
 * Goal Detail Modal - 상세 본문 렌더링
 */

import { getSupabaseClientSafe } from '@shared/api';
import {
  cache,
  isCacheValid,
  formatNumberWithCommas,
  cleanClientNameShort,
  formatDateForHeader,
  calculateGoalMetrics,
  getMetricColorClasses,
  CATEGORY_LABELS,
  escapeHtml,
  devLog,
  showToast,
} from '@shared/lib';
import { renderActionItemHTML, handleActionItemStatusToggle, showActionItemMemoInput } from './action';
import type { GoalWithRevenue } from '@shared/types';
import type { ActionItemRow } from '@shared/types';
import type { CategoryKey } from '@shared/types';
import type { CachedGoalDetail, OpenGoalDetailModalOptions } from './goal-detail-modal-types';

function attachActionDelegate(detailBody: HTMLElement, goalId: number): void {
  if (detailBody.hasAttribute('data-action-delegated')) return;
  detailBody.setAttribute('data-action-delegated', 'true');
  detailBody.addEventListener('click', async (e: Event) => {
    const icon = (e.target as HTMLElement).closest('.action-item-icon');
    if (!icon) return;
    e.stopPropagation();
    const actionItemElement = (e.target as HTMLElement).closest('.GoalCard__action-item');
    if (actionItemElement) {
      const actionItemId = actionItemElement.getAttribute('data-action-item-id');
      const currentStatus = actionItemElement.getAttribute('data-status') ?? 'progress';
      const goalIdStr = actionItemElement.getAttribute('data-goal-id') ?? String(goalId);
      let newStatus: 'progress' | 'done' | 'failed';
      if (currentStatus === 'progress') newStatus = 'done';
      else if (currentStatus === 'done') newStatus = 'failed';
      else newStatus = 'progress';
      if (newStatus === 'progress') {
        await handleActionItemStatusToggle(
          parseInt(actionItemId!, 10),
          currentStatus,
          parseInt(goalIdStr, 10)
        );
      } else {
        await showActionItemMemoInput(
          parseInt(actionItemId!, 10),
          newStatus,
          parseInt(goalIdStr, 10),
          actionItemElement as HTMLElement
        );
      }
    }
  });
}

function buildDetailBodyHTML(cached: CachedGoalDetail): string {
  const {
    goal,
    actionItems,
    detailMetrics,
    categoryLabel,
    descriptionText,
    dateRangeStr,
    totalCount,
    clientNames,
  } = cached;
  const colorClasses = getMetricColorClasses(goal, detailMetrics);
  const {
    goalRevenue,
    currentRevenue,
    targetGrowth,
    actualGrowth,
    achievementRateDecimal,
    growthRate,
    growthRatePercent,
  } = detailMetrics;
  const growthRateSign = growthRatePercent >= 0 ? '+' : '';
  const targetGrowthSign = targetGrowth >= 0 ? '+' : '';

  return `
    <div class="GoalCard__root GoalCard__root--currentWeek">
      <div class="GoalCard__header">
        <div class="GoalCard__header-left">
          <span class="GoalCard__categoryBadge goal-category-${goal.goal_category ?? 'etc'}">${escapeHtml(categoryLabel)}</span>
          <span class="GoalCard__objective">${escapeHtml(goal.memo ?? '목표 설명 없음')}</span>
        </div>
        ${dateRangeStr ? `<span class="GoalCard__date-range">${escapeHtml(dateRangeStr)}</span>` : ''}
      </div>
      <div class="GoalCard__description" style="--achievement-rate: ${achievementRateDecimal}">
        ${descriptionText}
      </div>
      <div class="GoalCard__body">
        <div class="GoalCard__body-left">
          <div class="GoalCard__metrics">
            <div class="GoalCard__metric-group">
              <div class="GoalCard__metric-row">
                <div class="GoalCard__metric-item GoalCard__metric-item--target">
                  <span class="GoalCard__metric-label">목표매출</span>
                  <span class="GoalCard__metric-value GoalCard__metric-value--target">${formatNumberWithCommas(goalRevenue)}</span>
                </div>
                <div class="GoalCard__metric-item GoalCard__metric-item--achieved ${colorClasses.achievedRevenueClass}">
                  <span class="GoalCard__metric-label">달성매출</span>
                  <span class="GoalCard__metric-value ${colorClasses.achievedRevenueClass}">${formatNumberWithCommas(currentRevenue)}</span>
                </div>
              </div>
              <div class="GoalCard__metric-row">
                <div class="GoalCard__metric-item GoalCard__metric-item--target">
                  <span class="GoalCard__metric-label">목표 성장치</span>
                  <span class="GoalCard__metric-value GoalCard__metric-value--target">${targetGrowthSign}${formatNumberWithCommas(targetGrowth)}</span>
                </div>
                <div class="GoalCard__metric-item ${colorClasses.achievedGrowthClass}">
                  <span class="GoalCard__metric-label">달성 성장치</span>
                  <span class="GoalCard__metric-value ${colorClasses.achievedGrowthClass}">${actualGrowth >= 0 ? '+' : ''}${formatNumberWithCommas(actualGrowth)}</span>
                </div>
              </div>
              <div class="GoalCard__metric-row">
                <div class="GoalCard__rate-item ${colorClasses.weeklyGrowthClass}">
                  <span class="GoalCard__rate-label">주간 매출 성장률</span>
                  <span class="GoalCard__rate-value ${colorClasses.weeklyGrowthClass}">${growthRate >= 0 ? '+' : ''}${growthRate}%</span>
                </div>
                <div class="GoalCard__rate-item ${colorClasses.goalAchievementClass}">
                  <span class="GoalCard__rate-label">목표 달성율</span>
                  <span class="GoalCard__rate-value ${colorClasses.goalAchievementClass}">${achievementRateDecimal}%</span>
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
        <div class="GoalCard__body-right">
          <div class="GoalCard__actions">
            <div class="GoalCard__section-title">
              <i class="ri-list-check-2"></i>
              <span>액션 아이템</span>
            </div>
            <div class="GoalCard__actions-list">
              ${actionItems.length === 0 ? '<div class="GoalCard__empty-state">액션 아이템 없음</div>' : actionItems.map((item) => renderActionItemHTML(item, goal.id)).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 캐시된 데이터로 상세 본문 렌더링 (본문 + 액션 델리게이트만, 모달 표시/닫기/편집 버튼은 호출부에서 처리)
 */
export function renderGoalDetailModalContent(
  cachedData: CachedGoalDetail,
  _modal: HTMLElement,
  detailBody: HTMLElement
): void {
  detailBody.innerHTML = buildDetailBodyHTML(cachedData);
  attachActionDelegate(detailBody, cachedData.goal.id);
}

/**
 * 데이터 조회 후 상세 본문 렌더링. 오류 시 예외를 던짐.
 */
export async function fetchAndRenderGoalDetailContent(
  goal: GoalWithRevenue,
  detailBody: HTMLElement,
  options?: OpenGoalDetailModalOptions
): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) {
    throw new Error('데이터를 불러올 수 없습니다. 연결을 확인해주세요.');
  }

  const [targetClientsResult, actionItemsResult] = await Promise.all([
    supabase
      .from('ads_data_goal_targetclient')
      .select('client_id')
      .eq('goal_id', goal.id),
    (async () => {
      const cached = cache.actionItems.get(goal.id);
      if (cached && isCacheValid(cached, cache.actionItemsTtl)) {
        return { data: cached.data, error: null };
      }
      const { data, error } = await supabase
        .from('ads_data_goal_actionitem')
        .select('id, action_item, status, done_memo')
        .eq('goal_id', goal.id)
        .order('id', { ascending: true });
      if (!error && data) {
        cache.actionItems.set(goal.id, { data, timestamp: Date.now() });
      }
      return { data: data ?? [], error };
    })(),
  ]);

  const { data: targetClients, error: targetError } = targetClientsResult;
  const clientIds = (targetClients as { client_id: number }[] | null)?.map(
    (tc) => tc.client_id
  ) ?? [];

  let clients: { id: number; name: string }[] = [];
  if (clientIds.length > 0 && !targetError) {
    const { data: clientData, error: clientError } = await supabase
      .from('ads_data_client')
      .select('client_id, client_name')
      .in('client_id', clientIds);
    if (!clientError && clientData) {
      clients = (clientData as { client_id: number; client_name: string }[]).map(
        (c) => ({
          id: c.client_id,
          name: cleanClientNameShort(c.client_name ?? ''),
        })
      );
    }
  }

  const { data: actionItemsData, error: actionError } = actionItemsResult;
  const actionItems = (actionError ? [] : (actionItemsData ?? [])) as ActionItemRow[];

  if (options?.checkRace && !options.checkRace(goal.id)) {
    throw new Error('RACE_ABORT');
  }
  if (!document.contains(detailBody)) {
    throw new Error('RACE_ABORT');
  }

  const detailMetrics = calculateGoalMetrics(goal);
  const colorClasses = getMetricColorClasses(goal, detailMetrics);
  const {
    startRevenue,
    goalRevenue,
    currentRevenue,
    targetGrowth,
    actualGrowth,
    achievementRateDecimal,
    growthRate,
    growthRatePercent,
  } = detailMetrics;

  const allClientNames = clients.map((c) => c.name).filter(Boolean);
  const totalCount = allClientNames.length;
  const clientNames = allClientNames.slice(0, 3);
  const categoryLabel =
    CATEGORY_LABELS[goal.goal_category as CategoryKey] ?? goal.goal_category ?? '기타';
  const growthRateSign = growthRatePercent >= 0 ? '+' : '';
  const targetGrowthSign = targetGrowth >= 0 ? '+' : '';
  const descriptionText = `기존 매출 <strong>${formatNumberWithCommas(startRevenue)}</strong>원을 <strong>${growthRateSign}${growthRatePercent}%</strong> / <strong>${targetGrowthSign}${formatNumberWithCommas(targetGrowth)}</strong>원 하여 <strong>${formatNumberWithCommas(goalRevenue)}</strong>원을 달성 한다.`;
  const startDateStr = goal.start_date ? formatDateForHeader(goal.start_date) : '';
  const endDateStr = goal.end_date ? formatDateForHeader(goal.end_date) : '';
  const dateRangeStr =
    startDateStr && endDateStr ? `${startDateStr} - ${endDateStr}` : '';

  const cached: CachedGoalDetail = {
    goal,
    clients,
    actionItems,
    detailMetrics,
    categoryLabel,
    descriptionText,
    dateRangeStr,
    totalCount,
    clientNames,
  };

  cache.goalDetails.set(goal.id, {
    data: cached,
    timestamp: Date.now(),
  });

  detailBody.innerHTML = buildDetailBodyHTML(cached);
  attachActionDelegate(detailBody, goal.id);
}
