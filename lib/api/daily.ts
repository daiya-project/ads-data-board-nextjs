/**
 * ads.daily table — latest date query for DataUpdateModal.
 * Schema: ads (project uses ads + shared only).
 */

import { createClient } from "@/lib/supabase/client";

/** Returns the latest date from ads.daily as YYYY-MM-DD, or null if none/error. */
export async function getLatestDateFromDb(): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .schema("ads")
    .from("daily")
    .select("date")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as { date?: string };
  return row?.date ?? null;
}
