"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { cleanClientName } from "@/lib/utils/string-utils";
import { buildDailySummary } from "@/lib/features/reports/daily-summary";
import type { DailyReportRow, SortState } from "@/lib/features/reports/daily-types";
import { cn } from "@/lib/utils";

function formatHeaderDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${month}. ${day}.`;
}

function getPreviousDate(dateStr: string, dateRange: string[], dateIndex: number): string {
  if (dateIndex === 0) return dateRange[1];
  const dateObj = new Date(dateStr);
  const dayOfWeek = dateObj.getDay();
  if (dayOfWeek === 1) {
    const prev = new Date(dateObj);
    prev.setDate(prev.getDate() - 3);
    return prev.toISOString().slice(0, 10);
  }
  return dateRange[dateIndex - 1];
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr);
  return d.getDay() === 0 || d.getDay() === 6;
}

function ratioColor(value: number): string {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value))
    return "";
  if (value < 0) return "text-blue-600 dark:text-blue-400";
  if (value > 0) return "text-red-600 dark:text-red-400";
  return "";
}

export interface DailyReportTableProps {
  dateRange: string[];
  holidays: Set<string>;
  clients: DailyReportRow[];
  sortState: SortState;
  onSort: (column: string) => void;
}

export function DailyReportTable({
  dateRange,
  holidays,
  clients,
  sortState,
  onSort,
}: DailyReportTableProps) {
  const summary = buildDailySummary(clients, dateRange);

  const renderSortIcon = (column: string) => {
    if (sortState.column !== column || !sortState.order) return null;
    return sortState.order === "asc" ? (
      <ChevronUp className="ml-1.5 inline h-3.5 w-3.5 opacity-75" aria-hidden />
    ) : (
      <ChevronDown className="ml-1.5 inline h-3.5 w-3.5 opacity-75" aria-hidden />
    );
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border/50 bg-card/50 shadow-xl backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border/50 bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60 backdrop-blur-sm">
              <th
                className={cn(
                  "group relative cursor-pointer select-none px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-foreground/70 transition-all duration-200",
                  "hover:bg-muted/80 hover:text-foreground",
                  sortState.column === "client_id" && "bg-muted/70 text-foreground",
                )}
                onClick={() => onSort("client_id")}
                title="Client ID"
                data-column="client_id"
              >
                <span className="relative">
                  Client ID
                  {renderSortIcon("client_id")}
                  <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary transition-all duration-200 group-hover:w-full" />
                </span>
              </th>
              <th
                className={cn(
                  "group relative cursor-pointer select-none px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-foreground/70 transition-all duration-200",
                  "hover:bg-muted/80 hover:text-foreground",
                  sortState.column === "client_name" && "bg-muted/70 text-foreground",
                )}
                onClick={() => onSort("client_name")}
                title="Client"
                data-column="client_name"
              >
                <span className="relative">
                  Client
                  {renderSortIcon("client_name")}
                  <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary transition-all duration-200 group-hover:w-full" />
                </span>
              </th>
              <th
                className={cn(
                  "group relative cursor-pointer select-none px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-foreground/70 transition-all duration-200",
                  "hover:bg-muted/80 hover:text-foreground",
                  sortState.column === "avgValue" && "bg-muted/70 text-foreground",
                )}
                onClick={() => onSort("avgValue")}
                title="평균 비교"
                data-column="avgValue"
              >
                <span className="relative">
                  평균 비교
                  {renderSortIcon("avgValue")}
                  <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary transition-all duration-200 group-hover:w-full" />
                </span>
              </th>
              <th
                className={cn(
                  "group relative cursor-pointer select-none px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-foreground/70 transition-all duration-200",
                  "hover:bg-muted/80 hover:text-foreground",
                  sortState.column === "dayBeforeValue" && "bg-muted/70 text-foreground",
                )}
                onClick={() => onSort("dayBeforeValue")}
                title="전일 비교"
                data-column="dayBeforeValue"
              >
                <span className="relative">
                  전일 비교
                  {renderSortIcon("dayBeforeValue")}
                  <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary transition-all duration-200 group-hover:w-full" />
                </span>
              </th>
              <th
                className={cn(
                  "group relative cursor-pointer select-none px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-foreground/70 transition-all duration-200",
                  "hover:bg-muted/80 hover:text-foreground",
                  sortState.column === "changeAmount" && "bg-muted/70 text-foreground",
                )}
                onClick={() => onSort("changeAmount")}
                title="증감"
                data-column="changeAmount"
              >
                <span className="relative">
                  증감
                  {renderSortIcon("changeAmount")}
                  <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary transition-all duration-200 group-hover:w-full" />
                </span>
              </th>
              {dateRange.map((date) => (
                <th
                  key={date}
                  className={cn(
                    "group relative cursor-pointer select-none px-4 py-4 text-center text-xs font-bold uppercase tracking-wider transition-all duration-200",
                    holidays.has(date)
                      ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                      : "text-foreground/70 hover:bg-muted/80 hover:text-foreground",
                    sortState.column === date && "bg-muted/70 text-foreground",
                  )}
                  onClick={() => onSort(date)}
                  title={date}
                  data-column={date}
                >
                  <span className="relative">
                    {formatHeaderDate(date)}
                    {renderSortIcon(date)}
                    <span
                      className={cn(
                        "absolute bottom-0 left-0 h-0.5 w-0 transition-all duration-200 group-hover:w-full",
                        holidays.has(date) ? "bg-red-500" : "bg-primary",
                      )}
                    />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="group/summary border-b border-border/30 bg-gradient-to-r from-primary/5 via-primary/3 to-primary/5 backdrop-blur-sm font-semibold transition-colors duration-200 hover:from-primary/8 hover:via-primary/6 hover:to-primary/8">
              <td className="px-4 py-3.5 text-center" />
              <td className="px-4 py-3.5 text-center text-sm font-bold text-foreground">
                합계
              </td>
              <td
                className={cn(
                  "px-4 py-3.5 text-center text-sm font-bold tabular-nums",
                  ratioColor(summary.avgValue),
                )}
              >
                {summary.avgRatio}%
              </td>
              <td
                className={cn(
                  "px-4 py-3.5 text-center text-sm font-bold tabular-nums",
                  ratioColor(summary.dayBeforeValue),
                )}
              >
                {summary.dayBeforeRatio}%
              </td>
              <td
                className={cn(
                  "px-4 py-3.5 text-right text-sm font-bold tabular-nums",
                  ratioColor(summary.changeAmount),
                )}
              >
                {summary.changeAmount.toLocaleString("ko-KR")}
              </td>
              {dateRange.map((date, dateIndex) => (
                <td
                  key={date}
                  className={cn(
                    "px-4 py-3.5 text-right text-sm font-bold tabular-nums transition-colors duration-200",
                    dateIndex === 0 &&
                      "bg-amber-100/60 dark:bg-amber-950/40 shadow-[inset_0_0_8px_rgba(251,191,36,0.1)]",
                  )}
                >
                  {(summary.totals.get(date) ?? 0).toLocaleString("ko-KR")}
                </td>
              ))}
            </tr>
            {clients.map((client, idx) => {
              const avgVal = client.avgValue;
              const dayVal = client.dayBeforeValue;
              const change = client.changeAmount ?? 0;
              return (
                <tr
                  key={client.client_id}
                  className={cn(
                    "group/row border-b border-border/20 transition-all duration-200",
                    "hover:bg-muted/30 hover:shadow-sm",
                    idx % 2 === 0 ? "bg-card/30" : "bg-muted/10",
                  )}
                >
                  <td className="px-4 py-3 text-center text-sm font-medium text-foreground/80">
                    {client.client_id}
                  </td>
                  <td
                    className="max-w-[250px] overflow-hidden text-ellipsis whitespace-nowrap px-4 py-3 text-center text-sm font-medium text-foreground/90"
                    title={client.client_name}
                  >
                    {cleanClientName(client.client_name)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-center text-sm font-semibold tabular-nums",
                      ratioColor(avgVal ?? 0),
                    )}
                  >
                    {client.avgRatio ?? ""}%
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-center text-sm font-semibold tabular-nums",
                      ratioColor(dayVal ?? 0),
                    )}
                  >
                    {client.dayBeforeRatio ?? ""}%
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right text-sm font-semibold tabular-nums",
                      ratioColor(change),
                    )}
                  >
                    {(client.changeAmount ?? 0).toLocaleString("ko-KR")}
                  </td>
                  {dateRange.map((date, dateIndex) => {
                    const amount = client.amounts.get(date) ?? 0;
                    const prevDate = getPreviousDate(date, dateRange, dateIndex);
                    const prevAmount = client.amounts.get(prevDate) ?? 0;
                    let cellColor = "";
                    if (!isWeekend(date) && prevAmount > 0) {
                      if (amount > prevAmount)
                        cellColor = " text-red-600 dark:text-red-400 font-semibold";
                      else if (amount < prevAmount)
                        cellColor = " text-blue-600 dark:text-blue-400 font-semibold";
                    }
                    if (holidays.has(date))
                      cellColor = " text-muted-foreground/50 font-normal";
                    return (
                      <td
                        key={date}
                        className={cn(
                          "px-4 py-3 text-right text-sm tabular-nums transition-colors duration-200",
                          dateIndex === 0 &&
                            "bg-amber-50/40 dark:bg-amber-950/20 shadow-[inset_0_0_6px_rgba(251,191,36,0.08)]",
                          cellColor,
                        )}
                      >
                        {amount.toLocaleString("ko-KR")}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
