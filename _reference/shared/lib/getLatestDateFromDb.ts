/**
 * ads_data_daily의 최신 date 1건을 YYYY-MM-DD로 반환.
 * 데이터 없거나 오류 시 null.
 */

import { getSupabaseClientSafe } from '@shared/api';

export async function getLatestDateFromDb(): Promise<string | null> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('ads_data_daily')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
    .single();
  if (error || !data || !(data as { date?: string }).date) return null;
  return (data as { date: string }).date;
}
