/**
 * Daily report table types.
 * client_id is string per 40-data-main-rule.
 */

// Re-export shared types for convenience
export type { SortOrder, SortState, DailyStatusData } from "./shared-types";

/**
 * Daily report row data.
 * Represents one client's daily data across a date range.
 */
export interface DailyReportRow {
  client_id: string;
  client_name: string;
  manager_id: number | null;
  amounts: Map<string, number>;
  mostRecentAmount?: number;
  changeAmount?: number;
  dayBeforeRatio?: string;
  dayBeforeValue?: number;
  avgRatio?: string;
  avgValue?: number;
}

/**
 * Daily report data result.
 * Full result from fetchDailyReportData including clients, date range, and holidays.
 */
export interface DailyReportDataResult {
  clients: DailyReportRow[];
  dateRange: string[];
  holidays: Set<string>;
}
