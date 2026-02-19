/**
 * 공통 타입 정의
 */

export type DateFormat = 'YYYY-MM-DD' | 'MM.DD.' | 'YY.MM.DD';

export interface SupabaseQueryBuilder {
  select: (columns?: string) => SupabaseQueryBuilder;
  insert: (data: unknown) => SupabaseQueryBuilder;
  update: (data: unknown) => SupabaseQueryBuilder;
  eq: (column: string, value: unknown) => SupabaseQueryBuilder;
  in: (column: string, values: unknown[]) => SupabaseQueryBuilder;
  is: (column: string, value: null) => SupabaseQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => SupabaseQueryBuilder;
  limit: (n: number) => SupabaseQueryBuilder;
  range?: (from: number, to: number) => SupabaseQueryBuilder;
  single: () => Promise<{ data: unknown; error: unknown }>;
  not?: (column: string, op: string, value: unknown) => SupabaseQueryBuilder;
  or?: (expr: string) => SupabaseQueryBuilder;
  gte?: (column: string, value: unknown) => SupabaseQueryBuilder;
  lte?: (column: string, value: unknown) => SupabaseQueryBuilder;
  neq?: (column: string, value: unknown) => SupabaseQueryBuilder;
}

export interface SupabaseClient {
  from: (table: string) => SupabaseQueryBuilder;
  rpc?: (fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
}

export type ActionStatusKey = 'progress' | 'done' | 'failed';
export type CategoryKey = 'new' | 'upsales_big' | 'upsales_smb' | 'outbound' | 'etc';

/** 목표 메트릭 계산용 입력 */
export interface GoalMetricsInput {
  start_revenue?: number;
  goal_revenue?: number;
  currentRevenue?: number;
}

/** 목표 메트릭 계산 결과 */
export interface GoalMetricsResult {
  startRevenue: number;
  goalRevenue: number;
  currentRevenue: number;
  targetGrowth: number;
  actualGrowth: number;
  achievementRate: number;
  achievementRateDecimal: number;
  growthRate: number;
  growthRatePercent: number;
  achievedColorClass: string;
  growthRateColorClass: string;
  colorClass: string;
  bgClass: string;
}

/** 메트릭별 색상 클래스 */
export interface MetricColorClasses {
  achievedRevenueClass: string;
  achievedGrowthClass: string;
  weeklyGrowthClass: string;
  goalAchievementClass: string;
}

/** API 매니저 */
export interface ManagerRow {
  id: number;
  manager_name: string;
}

/** API 클라이언트 */
export interface ClientRow {
  client_id: number;
  client_name: string;
}

/** 액션 아이템 (목표 상세/카드용) */
export interface ActionItemRow {
  id: number;
  action_item: string;
  status?: ActionStatusKey;
  done_memo?: string | null;
}

/** 목표 기본 (id, start_date, end_date, goal_revenue, start_revenue, memo, goal_category 등) */
export interface GoalBase {
  id: number;
  start_date?: string;
  end_date?: string;
  goal_revenue?: number;
  start_revenue?: number;
  memo?: string | null;
  goal_category?: CategoryKey | string | null;
  [key: string]: unknown;
}

/** 매출 포함 목표 (loadGoalsWithRevenue 결과) */
export interface GoalWithRevenue extends GoalBase {
  currentRevenue?: number;
  achievementRate?: number;
  growthRate?: number;
  actionItemCount?: number;
  actionItems?: ActionItemRow[];
  targetClientsInfo?: { clientNames: string[]; totalCount: number };
}

/** 주간 요약 (Summary 카드/모달용) */
export interface WeekSummary {
  totalStartRevenue: number;
  totalCurrentRevenue: number;
  totalGoalRevenue: number;
  growthAmount: number;
  achievementRate: number;
}

/** 목표 등록 모달 컨텍스트 (main.js에서 주입) */
export interface GoalRegisterContext {
  selectedClientIds: Set<string>;
  availableClients: { client_id: number; client_name?: string; lastWeekRevenue?: number }[];
  lastPercentage?: { value: number | null };
  currentManagerTabId?: string;
  datePickerState?: { selectedDate?: Date };
  loadGoalManagerOptions?: () => Promise<void>;
  loadClientList?: (managerId: number) => Promise<void>;
  renderSelectedClients?: () => void;
  renderClientOptions?: (clients: unknown[], searchTerm?: string) => void;
  updateClientSelectCount?: () => void;
  updateHiddenInput?: () => void;
  resetModalState?: (ctx: GoalRegisterContext) => void;
  resetActionItems?: () => void;
  renderExistingActionItems?: (items: ActionItemRow[]) => void;
  closeGoalDetailModal?: () => void;
  recalculateStartRevenueForEdit?: (goalId: number, startDate: string, periodType: 'weekly' | 'monthly', calcWeekly: (d: Date) => { start_date: string; end_date: string }, calcMonthly: (d: Date) => { start_date: string; end_date: string }) => Promise<void>;
  showToast?: (message: string) => void;
  loadManagerGoals?: (managerId: string) => Promise<void>;
  loadAllManagersGoals?: () => Promise<void>;
  /** 7차: 등록/수정 성공 후 Goal Monthly 탭이 활성일 때 UPPER+LOWER 갱신 */
  onGoalSaved?: () => Promise<void>;
  clearAllClients?: () => void;
  openDatePicker?: () => void;
  closeDatePicker?: () => void;
  changeDatePickerMonth?: (delta: number) => void;
  selectTodayDate?: () => void;
}

export type { AdsOnlyDatabase } from './app-db.types';
export * from './strict-types';
