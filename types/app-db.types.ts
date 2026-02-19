/**
 * App-level type re-exports (schema: ads).
 *
 * Re-export only the tables/views the app actually uses
 * so that components and lib code don't depend on the full
 * auto-generated schema.
 *
 * Usage:
 *   import type { Database, RefManagerRow } from "@/types/app-db.types";
 */

import type { Database } from "./database.types";

export type { Database };

export type AdsSchema = Database["ads"];

// Views (ads schema)
export type RefHolidayRow = Database["ads"]["Views"]["ref_holiday"]["Row"];
export type RefManagerRow = Database["ads"]["Views"]["ref_manager"]["Row"];
export type RefWeekRow = Database["ads"]["Views"]["ref_week"]["Row"];
