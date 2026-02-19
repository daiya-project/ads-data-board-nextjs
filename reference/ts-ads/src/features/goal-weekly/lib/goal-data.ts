/**
 * Goal Weekly Feature — 목표 데이터 로드 (비즈니스 로직)
 * Supabase 호출은 shared/api/goal-api 사용.
 */

import { getSupabaseClientSafe } from '@shared/api';
import { getCachedElementById, handleError } from '@shared/lib';
import {
  formatNumberWithCommas,
  cleanClientNameShort,
  removeCommas,
  formatDate,
} from '@shared/lib';
import type { GoalBase, GoalWithRevenue } from '@shared/types';
import type { ActionItemRow } from '@shared/types';
import {
  getManagersForGoalSetting,
  getTeamGoalsForYear,
  getManagerGoalsForYear,
  getGoalTargetClients,
  getClientNamesForIds,
  getActionItemsByGoalIds,
  getDailyAmountsForClients,
} from '../../../shared/api/goal-api';

export async function loadGoalSetting(): Promise<HTMLElement | null | undefined> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) {
    handleError(
      new Error('Supabase 클라이언트가 초기화되지 않았습니다.'),
      'loadGoalSetting'
    );
    return undefined;
  }

  const tbody = getCachedElementById('goal-setting-tbody') as HTMLElement | null;
  const thead = getCachedElementById('goal-setting-thead') as HTMLElement | null;

  if (!tbody || !thead) {
    console.error('Goal Setting 테이블 요소를 찾을 수 없습니다.');
    return undefined;
  }

  tbody.innerHTML =
    '<tr><td colspan="100" class="empty-state">데이터 로딩 중...</td></tr>';

  try {
    const managers = await getManagersForGoalSetting();
    const teamGoals = await getTeamGoalsForYear(2026, '2026-01-01', '2026-12-31');
    const managerIds = managers.map((m) => m.id);
    const managerGoals = await getManagerGoalsForYear(
      managerIds,
      '2026-01-01',
      '2026-12-31'
    );

    const teamGoalMap = new Map<string, number>();
    for (const goal of teamGoals) {
      const date = new Date(goal.start_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      teamGoalMap.set(monthKey, goal.goal_revenue ?? 0);
    }

    const managerGoalMap = new Map<string, number>();
    for (const goal of managerGoals) {
      const date = new Date(goal.start_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      managerGoalMap.set(`${goal.manager_id}-${monthKey}`, goal.goal_revenue ?? 0);
    }

    const headerRow = thead.querySelector('tr');
    if (headerRow) {
      headerRow.innerHTML = '';
      const headers = ['월', 'Team', 'Total', 'Gap'];
      for (const text of headers) {
        const th = document.createElement('th');
        th.textContent = text;
        th.style.textAlign = 'center';
        headerRow.appendChild(th);
      }
      for (const manager of managers) {
        const th = document.createElement('th');
        th.textContent = manager.manager_name ?? `Manager ${manager.id}`;
        th.style.textAlign = 'center';
        th.style.fontFamily = "'Roboto Mono', monospace";
        headerRow.appendChild(th);
      }
    }

    tbody.innerHTML = '';

    for (let month = 1; month <= 12; month++) {
      const monthKey = `2026-${String(month).padStart(2, '0')}`;
      const monthLabel = `2026년 ${String(month).padStart(2, '0')}월`;
      const teamGoal = teamGoalMap.get(monthKey) ?? 0;

      const row = document.createElement('tr');
      row.dataset.monthKey = monthKey;

      const tdMonth = document.createElement('td');
      tdMonth.textContent = monthLabel;
      tdMonth.style.textAlign = 'center';
      tdMonth.style.fontFamily = "'Roboto Mono', monospace";
      row.appendChild(tdMonth);

      const tdTeam = document.createElement('td');
      tdTeam.textContent = teamGoal > 0 ? formatNumberWithCommas(teamGoal) : '';
      tdTeam.style.fontFamily = "'Roboto Mono', monospace";
      tdTeam.style.textAlign = 'right';
      tdTeam.className = 'readonly-cell';
      row.appendChild(tdTeam);

      const tdTotal = document.createElement('td');
      tdTotal.className = 'total-cell readonly-cell';
      tdTotal.style.fontFamily = "'Roboto Mono', monospace";
      tdTotal.style.textAlign = 'right';
      row.appendChild(tdTotal);

      const tdGap = document.createElement('td');
      tdGap.className = 'gap-cell readonly-cell';
      tdGap.style.fontFamily = "'Roboto Mono', monospace";
      tdGap.style.textAlign = 'right';
      row.appendChild(tdGap);

      let totalManagerGoals = 0;
      for (const manager of managers) {
        const mapKey = `${manager.id}-${monthKey}`;
        const managerGoal = managerGoalMap.get(mapKey) ?? 0;
        totalManagerGoals += managerGoal;

        const td = document.createElement('td');
        td.textContent = managerGoal > 0 ? formatNumberWithCommas(managerGoal) : '';
        td.style.fontFamily = "'Roboto Mono', monospace";
        td.style.textAlign = 'right';
        td.className = 'editable-cell';
        td.dataset.managerId = String(manager.id);
        td.dataset.monthKey = monthKey;
        row.appendChild(td);
      }

      tdTotal.textContent =
        totalManagerGoals > 0 ? formatNumberWithCommas(totalManagerGoals) : '';

      const filledManagerCount = managers.filter((m) => {
        const mapKey = `${m.id}-${monthKey}`;
        return (managerGoalMap.get(mapKey) ?? 0) > 0;
      }).length;

      if (filledManagerCount === managers.length && managers.length > 0) {
        tdGap.textContent =
          totalManagerGoals - teamGoal !== 0
            ? formatNumberWithCommas(totalManagerGoals - teamGoal)
            : '';
      } else {
        tdGap.textContent = '';
      }

      tbody.appendChild(row);
    }
  } catch (err) {
    handleError(err as Error, 'loadGoalSetting', '데이터를 불러오는 중 오류가 발생했습니다.');
    tbody.innerHTML =
      '<tr><td colspan="100" class="empty-state">데이터를 불러오는 중 오류가 발생했습니다: ' +
      (err as Error).message +
      '</td></tr>';
  }

  return tbody;
}

export async function loadGoalsWithRevenue(
  goals: GoalBase[],
  forceRefresh = false,
  forceRefreshGoalIds: number[] = []
): Promise<GoalWithRevenue[]> {
  if (!goals?.length) return goals as GoalWithRevenue[];

  const supabase = getSupabaseClientSafe();
  if (!supabase) return goals as GoalWithRevenue[];

  const today = formatDate(new Date());
  const cacheKey = `goal_revenue_updated_${today}`;
  const updatedToday: number[] = JSON.parse(localStorage.getItem(cacheKey) ?? '[]');
  const forceRefreshSet = new Set(forceRefreshGoalIds);
  const updatedTodaySet = forceRefresh ? new Set<number>() : new Set(updatedToday);
  const goalIds = goals.map((g) => g.id);

  const goalsToUpdate = forceRefresh
    ? goals
    : goals.filter(
        (g) => !updatedTodaySet.has(g.id) || forceRefreshSet.has(g.id)
      );

  try {
    const targetClients = await getGoalTargetClients(goalIds);
    const goalClientMap = new Map<number, number[]>();
    const allTargetClientIds = new Set<number>();
    for (const tc of targetClients) {
      if (!goalClientMap.has(tc.goal_id)) goalClientMap.set(tc.goal_id, []);
      goalClientMap.get(tc.goal_id)!.push(tc.client_id);
      allTargetClientIds.add(tc.client_id);
    }

    const rawClientNameMap = await getClientNamesForIds(Array.from(allTargetClientIds));
    const clientNameMap = new Map<number, string>();
    rawClientNameMap.forEach((name, id) => {
      clientNameMap.set(id, cleanClientNameShort(name ?? ''));
    });

    const actionItemsByGoal = await getActionItemsByGoalIds(goalIds);
    const actionItemCountMap = new Map<number, number>();
    const actionItemsMap = new Map<number, ActionItemRow[]>();
    for (const { goalId, items } of actionItemsByGoal) {
      actionItemCountMap.set(goalId, items.length);
      actionItemsMap.set(goalId, items);
    }

    const goalsWithRevenue = await Promise.all(
      goals.map(async (goal): Promise<GoalWithRevenue> => {
        const clientIds = goalClientMap.get(goal.id) ?? [];
        const clientNames: string[] = [];
        for (let i = 0; i < Math.min(clientIds.length, 3); i++) {
          const name = clientNameMap.get(clientIds[i]);
          if (name) clientNames.push(name);
        }
        const actionItemCount = actionItemCountMap.get(goal.id) ?? 0;
        const actionItems = actionItemsMap.get(goal.id) ?? [];

        if (!forceRefresh && updatedTodaySet.has(goal.id) && !forceRefreshSet.has(goal.id)) {
          const cacheDataKey = `goal_revenue_${goal.id}_${today}`;
          const cachedData = localStorage.getItem(cacheDataKey);
          if (cachedData) {
            try {
              const cached = JSON.parse(cachedData) as {
                currentRevenue?: number;
                achievementRate?: number;
                growthRate?: number;
                actionItemCount?: number;
              };
              return {
                ...goal,
                currentRevenue: cached.currentRevenue ?? 0,
                achievementRate: cached.achievementRate ?? 0,
                growthRate: cached.growthRate ?? 0,
                actionItemCount: cached.actionItemCount ?? 0,
                actionItems,
                targetClientsInfo: { clientNames, totalCount: clientIds.length },
              };
            } catch {
              // fall through to recompute
            }
          }
        }

        if (clientIds.length === 0) {
          const result: GoalWithRevenue = {
            ...goal,
            currentRevenue: 0,
            achievementRate: 0,
            growthRate: 0,
            actionItemCount,
            actionItems,
            targetClientsInfo: { clientNames: [], totalCount: 0 },
          };
          if (goalsToUpdate.includes(goal)) {
            localStorage.setItem(
              `goal_revenue_${goal.id}_${today}`,
              JSON.stringify({
                currentRevenue: 0,
                achievementRate: 0,
                growthRate: 0,
                actionItemCount: 0,
              })
            );
            updatedToday.push(goal.id);
          }
          return result;
        }

        const endDate =
          goal.end_date && new Date(goal.end_date) <= new Date(today)
            ? goal.end_date
            : today;

        const currentRevenue = await getDailyAmountsForClients(
          clientIds,
          goal.start_date!,
          endDate
        );
        const goalRevenue = goal.goal_revenue ?? 0;
        const startRevenue = goal.start_revenue ?? 0;
        const achievementRate =
          goalRevenue > 0 ? (currentRevenue / goalRevenue) * 100 : 0;
        const growthRate =
          startRevenue > 0
            ? ((goalRevenue - startRevenue) / startRevenue) * 100
            : 0;

        const result: GoalWithRevenue = {
          ...goal,
          currentRevenue,
          achievementRate,
          growthRate,
          actionItemCount,
          actionItems,
          targetClientsInfo: { clientNames, totalCount: clientIds.length },
        };

        if (goalsToUpdate.includes(goal)) {
          localStorage.setItem(
            `goal_revenue_${goal.id}_${today}`,
            JSON.stringify({
              currentRevenue,
              achievementRate,
              growthRate,
              actionItemCount,
              actionItems,
            })
          );
          updatedToday.push(goal.id);
        }

        return result;
      })
    );

    if (goalsToUpdate.length > 0) {
      localStorage.setItem(cacheKey, JSON.stringify(updatedToday));
    }

    return goalsWithRevenue;
  } catch (err) {
    console.error('매출 데이터 로드 오류:', err);
    return goals as GoalWithRevenue[];
  }
}
