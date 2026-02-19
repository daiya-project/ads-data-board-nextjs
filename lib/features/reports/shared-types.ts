/**
 * Reports shared types (Daily & Weekly common)
 * Consolidates sorting, status data types for reuse across report features.
 */

/**
 * Sort order type
 */
export type SortOrder = "asc" | "desc" | null;

/**
 * Sort state for table columns
 */
export interface SortState {
  column: string;
  order: SortOrder;
}

/**
 * Daily report status data (5 categories)
 * Used by StatusCards component and daily report calculations.
 */
export interface DailyStatusData<TRow = unknown> {
  active: { today: TRow[]; yesterday: TRow[] };
  new: { clients: TRow[]; totalAmount: number };
  stopped: { clients: TRow[]; totalAmount: number };
  rising: { clients: TRow[]; totalAmount: number };
  falling: { clients: TRow[]; totalAmount: number };
}

/**
 * Weekly report status data (5 categories)
 * Used by StatusCards component and weekly report calculations.
 */
export interface WeeklyStatusData<TRow = unknown> {
  active: { currentWeek: TRow[]; previousWeek: TRow[] };
  new: { clients: TRow[]; totalAmount: number };
  stopped: { clients: TRow[]; totalAmount: number };
  rising: { clients: TRow[]; totalAmount: number };
  falling: { clients: TRow[]; totalAmount: number };
}
