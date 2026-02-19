/**
 * Daily report — sort clients by column.
 * Pure functions; sort state is held by the caller (e.g. React state).
 */

import type { DailyReportRow, SortState } from "./daily-types";

export function cycleSortState(prev: SortState, column: string): SortState {
  if (prev.column === column) {
    if (prev.order === "asc") return { column, order: "desc" };
    if (prev.order === "desc") return { column, order: null };
    return { column, order: "asc" };
  }
  return { column, order: "asc" };
}

export function sortDailyClients(
  clients: DailyReportRow[],
  column: string,
  order: SortState["order"]
): DailyReportRow[] {
  if (!order) {
    return [...clients].sort(
      (a, b) => (b.mostRecentAmount ?? 0) - (a.mostRecentAmount ?? 0)
    );
  }
  const sorted = [...clients];
  sorted.sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;
    switch (column) {
      case "client_id":
        aVal = a.client_id;
        bVal = b.client_id;
        break;
      case "client_name":
        aVal = a.client_name;
        bVal = b.client_name;
        break;
      case "avgValue":
        aVal =
          a.avgValue === Infinity ? Number.MAX_VALUE : (a.avgValue ?? 0);
        bVal =
          b.avgValue === Infinity ? Number.MAX_VALUE : (b.avgValue ?? 0);
        break;
      case "dayBeforeValue":
        aVal =
          a.dayBeforeValue === Infinity
            ? Number.MAX_VALUE
            : (a.dayBeforeValue ?? 0);
        bVal =
          b.dayBeforeValue === Infinity
            ? Number.MAX_VALUE
            : (b.dayBeforeValue ?? 0);
        break;
      case "changeAmount":
        aVal = a.changeAmount ?? 0;
        bVal = b.changeAmount ?? 0;
        break;
      case "mostRecentAmount":
        aVal = a.mostRecentAmount ?? 0;
        bVal = b.mostRecentAmount ?? 0;
        break;
      default:
        aVal = a.amounts.get(column) ?? 0;
        bVal = b.amounts.get(column) ?? 0;
    }
    if (order === "asc") {
      if (typeof aVal === "string") return aVal.localeCompare(String(bVal));
      return (aVal as number) - (bVal as number);
    }
    if (typeof aVal === "string")
      return String(bVal).localeCompare(aVal);
    return (bVal as number) - (aVal as number);
  });
  return sorted;
}
