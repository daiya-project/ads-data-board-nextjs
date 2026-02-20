/**
 * ads.daily table — latest date query for DataUpdateModal.
 * Schema: ads (project uses ads + shared only).
 */

import { createClient } from "@/lib/supabase/client";

/** Returns the latest date from ads.daily as YYYY-MM-DD, or null if no rows. Throws on DB error (42-data-supabase-rule). */
export async function getLatestDateFromDb(): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .schema("ads")
    .from("daily")
    .select("date")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getLatestDateFromDb failed:", error);
    throw new Error(`최신 날짜 조회 실패: ${error.message}`);
  }
  if (!data) return null;
  const row = data as { date?: string };
  return row?.date ?? null;
}
