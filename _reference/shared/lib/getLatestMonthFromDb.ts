/**
 * 31-term-main: "현재 월"은 DB 최신 날짜 기반.
 * ads_data_daily의 최신 date에서 YYYY-MM 반환.
 * 데이터 없거나 오류 시에만 시스템 날짜 fallback.
 */

import { getSupabaseClientSafe } from '@shared/api';

export async function getLatestMonthFromDb(): Promise<string> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
  }
  const { data, error } = await supabase
    .from('ads_data_daily')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
    .single();
  if (error || !data || !(data as { date?: string }).date) {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
  }
  const dateStr = (data as { date: string }).date;
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
