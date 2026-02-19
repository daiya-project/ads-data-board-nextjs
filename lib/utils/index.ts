/**
 * Barrel export for shared utilities.
 *
 * Re-export helpers here so consumers can do:
 *   import { cn, formatDate } from "@/lib/utils";
 */
export { cn } from "@/lib/utils/cn";
export { cleanClientName } from "@/lib/utils/string-utils";
export { normalizeDate, getRecentDateRange } from "@/lib/utils/date-utils";
