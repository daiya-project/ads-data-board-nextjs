"use client";

import { useMemo, useState } from "react";
import { DailyReportTable } from "@/components/features/reports/DailyReportTable";
import { cycleSortState, sortDailyClients } from "@/lib/features/reports/daily-sort";
import type { DailyReportRow, SortState } from "@/lib/features/reports/daily-types";
import {
  getMockDateRange,
  getMockHolidays,
  getMockClients,
} from "./mock-daily-data";

const DEFAULT_SORT: SortState = { column: "changeAmount", order: "asc" };

export function DailyReportClient() {
  const dateRange = useMemo(() => getMockDateRange(), []);
  const holidays = useMemo(() => getMockHolidays(), []);
  const clientsRaw = useMemo(() => getMockClients(dateRange), [dateRange]);

  const [sortState, setSortState] = useState<SortState>(DEFAULT_SORT);

  const clients: DailyReportRow[] = useMemo(
    () =>
      sortDailyClients(clientsRaw, sortState.column, sortState.order),
    [clientsRaw, sortState.column, sortState.order]
  );

  const handleSort = (column: string) => {
    setSortState((prev) => cycleSortState(prev, column));
  };

  return (
    <div className="space-y-6 p-8">
      <div className="space-y-2">
        <h1 className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
          일별 리포트
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          Daily revenue report with client-by-client breakdown
        </p>
      </div>
      <DailyReportTable
        dateRange={dateRange}
        holidays={holidays}
        clients={clients}
        sortState={sortState}
        onSort={handleSort}
      />
    </div>
  );
}
