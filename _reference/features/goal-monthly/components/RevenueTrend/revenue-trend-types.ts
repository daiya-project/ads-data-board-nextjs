/**
 * Revenue Trend - 타입 정의
 */

export interface DailyAmountRow {
  date: string;
  amount: number;
  client_id: number;
}

export interface ClientDailyData {
  clientId: number;
  clientName: string;
  dailyAmounts: Map<string, number>;
}

export interface TrendItem {
  clientId: number;
  clientName: string;
  recentAmount: number;
  previousAmount: number;
  changeAmount: number;
  changeRate: number;
}

export type TrendDirection = 'up' | 'down';
