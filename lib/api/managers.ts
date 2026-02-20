/**
 * Managers API
 * Functions for fetching manager data and filtering clients by manager.
 * Schema: shared (shared_manager) and ads (ads.client)
 */

import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Manager row type
 */
export interface ManagerRow {
  id: number;
  manager_name: string;
}

/**
 * Get list of managers from shared.manager table.
 * Filters by manager_team = 'ads' and orders by id ascending.
 *
 * @returns Array of managers. Throws on error (42-data-supabase-rule).
 */
export async function getManagerList(): Promise<ManagerRow[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .schema("shared")
    .from("manager")
    .select("id, manager_name")
    .eq("manager_team", "ads")
    .order("id", { ascending: true });

  if (error) {
    console.error("Manager 목록 조회 오류:", error);
    throw new Error(`담당자 목록 조회 실패: ${error.message}`);
  }

  return (data ?? []) as ManagerRow[];
}

/**
 * Get client_ids by manager filter value.
 * Supports single manager ID or comma-separated multiple IDs.
 * Special case: manager_id = 99 also includes clients with null manager_id.
 *
 * @param supabase - Supabase client instance
 * @param filterValue - Manager ID(s) as string (e.g., "1" or "1,2,99")
 * @returns Set of client_id (as string per 40-data-main-rule)
 *
 * @example
 * ```ts
 * const clientIds = await getClientIdsByManagerFilter(supabase, "1,2");
 * // Returns Set of client_id strings for managers 1 and 2
 * ```
 */
export async function getClientIdsByManagerFilter(
  supabase: SupabaseClient,
  filterValue: string
): Promise<Set<string>> {
  const trimmed = filterValue?.trim();
  if (!trimmed) return new Set();

  // Parse manager IDs
  let managerIds: number[];
  if (trimmed.includes(",")) {
    managerIds = trimmed
      .split(",")
      .map((id) => parseInt(id, 10))
      .filter((n) => !isNaN(n));
  } else {
    const managerId = parseInt(trimmed, 10);
    if (isNaN(managerId)) return new Set();
    managerIds = [managerId];
  }

  if (managerIds.length === 0) return new Set();

  let baseQuery = supabase
    .schema("ads")
    .from("client")
    .select("client_id")
    .not("manager_id", "is", null);

  if (managerIds.includes(99)) {
    const orConditions = managerIds.map((id) => `manager_id.eq.${id}`).join(",");
    baseQuery = baseQuery.or(`${orConditions},manager_id.is.null`);
  } else if (managerIds.length === 1) {
    baseQuery = baseQuery.eq("manager_id", managerIds[0]);
  } else {
    baseQuery = baseQuery.in("manager_id", managerIds);
  }

  const PAGE_SIZE = 1000; // 42-data-supabase-rule: PostgREST max 1000/request
  const allRows: { client_id: string | number }[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await baseQuery
      .order("client_id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("담당자 필터 조회 오류:", error);
      throw new Error(`담당자 필터 조회 실패: ${error.message}`);
    }

    const page = (data ?? []) as { client_id: string | number }[];
    allRows.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return new Set(allRows.map((row) => String(row.client_id)));
}
