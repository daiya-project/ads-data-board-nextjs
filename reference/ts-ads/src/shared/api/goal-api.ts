/**
 * Goal API — 목표 데이터 Supabase CRUD
 * goals/data.ts 및 Goal 관련 비즈니스 로직에서 사용
 */

import { getSupabaseClientSafe } from './supabase-client';

export interface ManagerRow {
  id: number;
  manager_name: string;
}

export interface TeamGoalRow {
  start_date: string;
  goal_revenue: number;
}

export interface ManagerGoalRow {
  manager_id: number;
  start_date: string;
  goal_revenue: number;
}

export interface GoalTargetClientRow {
  goal_id: number;
  client_id: number;
}

export interface ActionItemRow {
  id: number;
  action_item: string;
  status?: string;
  done_memo?: string | null;
}

/** Goal Setting용 매니저 목록 (ads 팀, 98/99 제외) */
export async function getManagersForGoalSetting(): Promise<ManagerRow[]> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('shared_manager')
    .select('id, manager_name')
    .eq('manager_team', 'ads')
    .neq('id', 98)
    .neq('id', 99)
    .order('id', { ascending: true });

  if (error) {
    console.error('매니저 데이터 조회 오류:', error);
    return [];
  }
  return (data ?? []) as ManagerRow[];
}

/** 팀 월간 목표 (manager_id null) */
export async function getTeamGoalsForYear(
  year: number,
  startDate: string,
  endDate: string
): Promise<TeamGoalRow[]> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('ads_data_goal')
    .select('start_date, goal_revenue')
    .is('manager_id', null)
    .eq('period_type', 'monthly')
    .gte('start_date', startDate)
    .lte('start_date', endDate)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('목표 데이터 조회 오류:', error);
    return [];
  }
  return (data ?? []) as TeamGoalRow[];
}

/** 매니저별 월간 목표 */
export async function getManagerGoalsForYear(
  managerIds: number[],
  startDate: string,
  endDate: string
): Promise<ManagerGoalRow[]> {
  const supabase = getSupabaseClientSafe();
  if (!supabase || !managerIds.length) return [];

  const { data, error } = await supabase
    .from('ads_data_goal')
    .select('manager_id, start_date, goal_revenue')
    .in('manager_id', managerIds)
    .eq('period_type', 'monthly')
    .gte('start_date', startDate)
    .lte('start_date', endDate)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('매니저 목표 데이터 조회 오류:', error);
    return [];
  }
  return (data ?? []) as ManagerGoalRow[];
}

/** 목표별 대상 광고주 (goal_id, client_id) */
export async function getGoalTargetClients(
  goalIds: number[]
): Promise<GoalTargetClientRow[]> {
  const supabase = getSupabaseClientSafe();
  if (!supabase || !goalIds.length) return [];

  const { data, error } = await supabase
    .from('ads_data_goal_targetclient')
    .select('goal_id, client_id')
    .in('goal_id', goalIds);

  if (error) {
    console.error('대상 광고주 조회 오류:', error);
    return [];
  }
  return (data ?? []) as GoalTargetClientRow[];
}

/** client_id 목록으로 client_name 맵 (ads_data_client) */
export async function getClientNamesForIds(
  clientIds: number[]
): Promise<Map<number, string>> {
  const supabase = getSupabaseClientSafe();
  const map = new Map<number, string>();
  if (!supabase || !clientIds.length) return map;

  const idStrings = clientIds.map((id) => String(id));
  const { data, error } = await supabase
    .from('ads_data_client')
    .select('client_id, client_name')
    .in('client_id', idStrings);

  if (error || !data) return map;
  for (const row of data as { client_id: number; client_name: string | null }[]) {
    map.set(row.client_id, row.client_name ?? '');
  }
  return map;
}

/** 목표별 액션 아이템 */
export async function getActionItemsByGoalIds(
  goalIds: number[]
): Promise<{ goalId: number; items: ActionItemRow[] }[]> {
  const supabase = getSupabaseClientSafe();
  if (!supabase || !goalIds.length) return [];

  const { data, error } = await supabase
    .from('ads_data_goal_actionitem')
    .select('goal_id, id, action_item, status, done_memo')
    .in('goal_id', goalIds)
    .order('id', { ascending: true });

  if (error) return [];
  const rows = (data ?? []) as {
    goal_id: number;
    id: number;
    action_item: string;
    status: string;
    done_memo?: string | null;
  }[];
  const byGoal = new Map<number, ActionItemRow[]>();
  for (const r of rows) {
    if (!byGoal.has(r.goal_id)) byGoal.set(r.goal_id, []);
    byGoal.get(r.goal_id)!.push({
      id: r.id,
      action_item: r.action_item,
      status: r.status as ActionItemRow['status'],
      done_memo: r.done_memo ?? null,
    });
  }
  return goalIds.map((goalId) => ({
    goalId,
    items: byGoal.get(goalId) ?? [],
  }));
}

/** 기간 내 광고주별 매출 합계 (ads_data_daily) */
export async function getDailyAmountsForClients(
  clientIds: number[],
  startDate: string,
  endDate: string
): Promise<number> {
  const supabase = getSupabaseClientSafe();
  if (!supabase || !clientIds.length) return 0;

  const idStrings = clientIds.map((id) => String(id));
  const { data, error } = await supabase
    .from('ads_data_daily')
    .select('amount')
    .in('client_id', idStrings)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) return 0;
  return (data as { amount: number }[] | null)?.reduce(
    (sum, r) => sum + (r.amount ?? 0),
    0
  ) ?? 0;
}
