/**
 * Goal Weekly Feature — 주간 데이터 로더
 */

import { getSupabaseClientSafe } from '@shared/api';
import { devLog, CATEGORY_ORDER } from '@shared/lib';
import { setWeekData } from '../components/WeekNavigation/navigation-state';
import { loadGoalsWithRevenue } from './goal-data';
import { getWeekBoundsForOffset } from './week-utils';
import type { SupabaseClient } from '@shared/types';
import type { WeekData } from './types';
import type { GoalWithRevenue } from '@shared/types';

interface WeekInfoRow {
  week_id: string;
  start_date: string;
  end_date: string;
  week_label?: string;
}

async function getWeekByOffset(
  supabase: SupabaseClient,
  offset: number
): Promise<WeekInfoRow | null> {
  const rpc = supabase.rpc;
  if (!rpc) return null;
  try {
    const { data, error } = await rpc('get_week_by_offset', { week_offset: offset });
    if (error) return null;
    const rows = data as WeekInfoRow[] | null;
    return rows && rows.length > 0 ? rows[0] : null;
  } catch {
    return null;
  }
}

function getWeekByOffsetFallback(offset: number): WeekInfoRow {
  return getWeekBoundsForOffset(offset);
}

function toDateOnly(value: string | Date | null | undefined): string {
  if (value == null) return '';
  const d = typeof value === 'string' ? new Date(value) : (value as Date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function loadWeeklyGoals(
  managerId: number,
  minOffset = -2,
  maxOffset = 2
): Promise<Map<number, WeekData>> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return new Map();
  if (!managerId) return new Map();

  const weekRanges: {
    offset: number;
    week_id: string;
    startDate: string;
    endDate: string;
    week_label?: string;
    weekData: WeekData;
  }[] = [];

  for (let offset = minOffset; offset <= maxOffset; offset++) {
    const weekInfo = (await getWeekByOffset(supabase, offset)) ?? getWeekByOffsetFallback(offset);
    weekRanges.push({
      offset,
      week_id: weekInfo.week_id,
      startDate: weekInfo.start_date,
      endDate: weekInfo.end_date,
      week_label: weekInfo.week_label,
      weekData: {
        offset,
        goals: [],
        startDate: new Date(weekInfo.start_date),
        endDate: new Date(weekInfo.end_date),
        week_id: weekInfo.week_id,
        week_label: weekInfo.week_label,
      },
    });
  }

  const overallStartDate = weekRanges[0].startDate;
  const overallEndDate = weekRanges[weekRanges.length - 1].endDate;

  const { data: goals, error } = await supabase
    .from('ads_data_goal')
    .select(
      'id, manager_id, period_type, start_date, end_date, goal_category, memo, start_revenue, goal_revenue, activate, created_at, updated_at'
    )
    .eq('manager_id', managerId)
    .eq('period_type', 'weekly')
    .eq('activate', true)
    .gte('start_date', overallStartDate)
    .lte('start_date', overallEndDate)
    .order('start_date', { ascending: true });

  if (error) {
    devLog('[loadWeeklyGoals] ads_data_goal 조회 오류:', error.message);
    return new Map();
  }

  const goalsList = (goals as GoalWithRevenue[]) ?? [];
  let goalsWithRevenue: GoalWithRevenue[] = [];
  if (goalsList.length > 0) {
    goalsWithRevenue = await loadGoalsWithRevenue(goalsList);
  }
  devLog('[loadWeeklyGoals] managerId:', managerId, '주간 목표 건수:', goalsList.length, '→', goalsWithRevenue.length);

  const weekMap = new Map<number, WeekData>();
  weekRanges.forEach(({ offset, weekData }) => {
    weekMap.set(offset, weekData);
  });

  goalsWithRevenue.forEach((goal) => {
    const goalStart = toDateOnly(goal.start_date);
    const goalEnd = toDateOnly(goal.end_date);
    for (const { offset, startDate, endDate, weekData } of weekRanges) {
      if (goalStart === startDate && goalEnd === endDate) {
        const data = weekMap.get(offset);
        if (data && !data.goals.some((g) => g.id === goal.id)) {
          data.goals.push(goal);
        }
        break;
      }
    }
  });

  weekMap.forEach((weekData) => {
    devLog('[loadWeeklyGoals] offset', weekData.offset, '목표 수:', weekData.goals.length);
    weekData.goals.sort((a, b) => {
      const orderA = CATEGORY_ORDER[a.goal_category as string] ?? 999;
      const orderB = CATEGORY_ORDER[b.goal_category as string] ?? 999;
      return orderA - orderB;
    });
    setWeekData(weekData.offset, weekData);
  });

  return weekMap;
}

export async function loadAllManagersWeeklyGoals(
  minOffset = -2,
  maxOffset = 2
): Promise<Map<number, WeekData>>;
export async function loadAllManagersWeeklyGoals(
  minOffset: number,
  maxOffset: number
): Promise<Map<number, WeekData>>;
export async function loadAllManagersWeeklyGoals(
  minOffset = -2,
  maxOffset = 2
): Promise<Map<number, WeekData>> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return new Map();

  const { data: managers, error: managerError } = await supabase
    .from('shared_manager')
    .select('id, manager_name, manager_team')
    .eq('manager_team', 'ads')
    .order('id', { ascending: true });

  if (managerError || !managers?.length) {
    devLog('[loadAllManagersWeeklyGoals] 매니저 없음 (manager_team=ads)', managerError?.message);
    return new Map();
  }

  const filteredManagers = (managers as { id: number }[]).filter((m) => m.id !== 98 && m.id !== 99);
  const managerIds = filteredManagers.map((m) => m.id);
  if (managerIds.length === 0) {
    devLog('[loadAllManagersWeeklyGoals] 필터 후 매니저 ID 없음');
    return new Map();
  }
  devLog('[loadAllManagersWeeklyGoals] 매니저 수:', managerIds.length, 'ids:', managerIds);

  const weekRanges: {
    offset: number;
    week_id: string;
    startDate: string;
    endDate: string;
    week_label?: string;
    weekData: WeekData;
  }[] = [];

  for (let offset = minOffset; offset <= maxOffset; offset++) {
    const weekInfo = (await getWeekByOffset(supabase, offset)) ?? getWeekByOffsetFallback(offset);
    weekRanges.push({
      offset,
      week_id: weekInfo.week_id,
      startDate: weekInfo.start_date,
      endDate: weekInfo.end_date,
      week_label: weekInfo.week_label,
      weekData: {
        offset,
        goals: [],
        startDate: new Date(weekInfo.start_date),
        endDate: new Date(weekInfo.end_date),
        week_id: weekInfo.week_id,
        week_label: weekInfo.week_label,
      },
    });
  }

  const overallStartDate = weekRanges[0].startDate;
  const overallEndDate = weekRanges[weekRanges.length - 1].endDate;

  const { data: goals, error } = await supabase
    .from('ads_data_goal')
    .select(
      'id, manager_id, period_type, start_date, end_date, goal_category, memo, start_revenue, goal_revenue, activate, created_at, updated_at'
    )
    .in('manager_id', managerIds)
    .eq('period_type', 'weekly')
    .eq('activate', true)
    .gte('start_date', overallStartDate)
    .lte('start_date', overallEndDate)
    .order('start_date', { ascending: true });

  if (error) {
    devLog('[loadAllManagersWeeklyGoals] ads_data_goal 조회 오류:', error.message);
    return new Map();
  }

  const goalsList = (goals as GoalWithRevenue[]) ?? [];
  let goalsWithRevenue: GoalWithRevenue[] = [];
  if (goalsList.length > 0) {
    goalsWithRevenue = await loadGoalsWithRevenue(goalsList);
  }
  devLog('[loadAllManagersWeeklyGoals] 주간 목표 건수:', goalsList.length, '→ revenue 보강 후:', goalsWithRevenue.length);

  const weekMap = new Map<number, WeekData>();
  weekRanges.forEach(({ offset, weekData }) => weekMap.set(offset, weekData));

  goalsWithRevenue.forEach((goal) => {
    const goalStart = toDateOnly(goal.start_date);
    const goalEnd = toDateOnly(goal.end_date);
    for (const { offset, startDate, endDate } of weekRanges) {
      if (goalStart === startDate && goalEnd === endDate) {
        const data = weekMap.get(offset);
        if (data) data.goals.push(goal);
        break;
      }
    }
  });

  weekMap.forEach((weekData) => {
    devLog('[loadAllManagersWeeklyGoals] offset', weekData.offset, '목표 수:', weekData.goals.length);
    weekData.goals.sort((a, b) => {
      const orderA = CATEGORY_ORDER[a.goal_category as string] ?? 999;
      const orderB = CATEGORY_ORDER[b.goal_category as string] ?? 999;
      return orderA - orderB;
    });
    setWeekData(weekData.offset, weekData);
  });

  return weekMap;
}

export async function loadSingleWeekGoals(
  managerId: number,
  offset: number
): Promise<WeekData> {
  const supabase = getSupabaseClientSafe();
  if (!supabase || !managerId) {
    return { offset, goals: [], startDate: new Date() };
  }

  const weekInfo = (await getWeekByOffset(supabase, offset)) ?? getWeekByOffsetFallback(offset);

  const { data: goals, error } = await supabase
    .from('ads_data_goal')
    .select(
      'id, manager_id, period_type, start_date, end_date, goal_category, memo, start_revenue, goal_revenue, activate, created_at, updated_at'
    )
    .eq('manager_id', managerId)
    .eq('period_type', 'weekly')
    .eq('activate', true)
    .eq('start_date', weekInfo.start_date)
    .eq('end_date', weekInfo.end_date)
    .order('goal_category', { ascending: true });

  if (error) {
    return { offset, goals: [], startDate: new Date(weekInfo.start_date) };
  }

  const goalsList = (goals as GoalWithRevenue[]) ?? [];
  let goalsWithRevenue: GoalWithRevenue[] = [];
  if (goalsList.length > 0) {
    goalsWithRevenue = await loadGoalsWithRevenue(goalsList);
  }

  const sortedGoals = goalsWithRevenue.sort((a, b) => {
    const orderA = CATEGORY_ORDER[a.goal_category as string] ?? 999;
    const orderB = CATEGORY_ORDER[b.goal_category as string] ?? 999;
    return orderA - orderB;
  });

  const weekData: WeekData = {
    offset,
    goals: sortedGoals,
    startDate: new Date(weekInfo.start_date),
    endDate: new Date(weekInfo.end_date),
    week_id: weekInfo.week_id,
    week_label: weekInfo.week_label,
  };
  setWeekData(offset, weekData);
  return weekData;
}
