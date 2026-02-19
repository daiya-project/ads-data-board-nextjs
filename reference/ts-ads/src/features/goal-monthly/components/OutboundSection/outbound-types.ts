/**
 * Outbound Section - 타입 정의
 */

export interface OutboundMonthlyCardData {
  month: string;
  revenue: number;
  activeClients: number;
}

/** 3개월 듀얼 축 차트 데이터 */
export interface Outbound3MonthChartData {
  labels: string[];
  dates: string[];
  dailyValues: (number | null)[];
  clientCounts: (number | null)[];
  lastDataIndex: number;
}

export interface OutboundViewRow {
  client_id: number;
  client_name: string;
  manager_id: number;
  second_manager_id: number | null;
  date: string;
  amount: number;
  outbound_start: string;
  outbound_end: string;
}

/** 주간 범위 정보 */
export interface OutboundWeeklyInfo {
  start: string;
  end: string;
}

export type ChartMode = 'daily' | 'weekly';
