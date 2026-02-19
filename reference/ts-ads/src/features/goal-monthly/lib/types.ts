/**
 * Goal Monthly Feature — 타입 정의
 */

/** ads_data_v_daily_summary 뷰 행 */
export interface DailySummaryRow {
  date: string;
  manager_id: number | null;
  daily_amount: number;
  client_count: number;
  is_holiday: boolean;
  is_weekend: boolean;
}

/** ads_data_v_weekly_progress 뷰 행 */
export interface WeeklyProgressRow {
  week_id: string;
  week_start: string;
  week_end: string;
  week_label: string;
  manager_id: number | null;
  week_achieved: number;
  client_count: number;
  data_day_count: number;
}

/** 캘린더 날짜 셀 */
export interface DayCell {
  date: string;
  dayOfWeek: number;
  dayLabel: string;
  amount: number;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  isLatestData: boolean;
  isFuture: boolean;
  hasData: boolean;
}

/** 주차별 프로그래스 바 데이터 */
export interface WeekGoalSummary {
  weekGoal: number;
  weekAchieved: number;
  rate: number;
  prevWeekAchieved: number | null;
}

/** 캘린더 주차 행 */
export interface CalendarWeekRow {
  weekId: string;
  weekLabel: string;
  weekRange: string;
  weekStart: string;
  weekEnd: string;
  days: DayCell[];
  goalSummary: WeekGoalSummary | null;
}

/** 캘린더 전체 데이터 */
export interface CalendarData {
  weeks: CalendarWeekRow[];
  weekdayAvg: number;
  latestDate: string;
}
