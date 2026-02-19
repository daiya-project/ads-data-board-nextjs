/**
 * Outbound Setting Modal - DB 저장/수정/삭제
 */

import { getSupabaseClientSafe } from '@shared/api';
import { showToast, devLog } from '@shared/lib';
import type { OutboundRecord } from './outbound-modal-types';

export async function saveOutboundRecord(
  clientId: number,
  startDate: string,
  endDate: string
): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return;

  const insertResult = await (supabase
    .from('ads_data_client_outbound')
    .insert({
      client_id: String(clientId),
      outbound_start: startDate,
      outbound_end: endDate,
    }) as unknown as Promise<{ data: unknown; error: { message: string } | null }>);

  if (insertResult.error) throw new Error(insertResult.error.message);

  await (supabase
    .from('ads_data_client')
    .update({ outbound: true })
    .eq('client_id', clientId) as unknown as Promise<{ data: unknown; error: unknown }>);

  showToast('✅ 신규 광고주 등록 완료');
}

export async function updateOutboundRecord(
  recordId: number,
  startDate: string,
  endDate: string
): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return;

  const updateResult = await (supabase
    .from('ads_data_client_outbound')
    .update({
      outbound_start: startDate,
      outbound_end: endDate,
    })
    .eq('id', recordId) as unknown as Promise<{ data: unknown; error: { message: string } | null }>);

  if (updateResult.error) throw new Error(updateResult.error.message);

  showToast('✅ 신규 광고주 기간 수정 완료');
}

export async function deleteOutboundRecord(clientId: number): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return;

  const queryResult = await (supabase
    .from('ads_data_client_outbound')
    .select('id')
    .eq('client_id', String(clientId))
    .order('created_at', { ascending: false })
    .limit(1) as unknown as Promise<{ data: { id: number }[] | null; error: { message: string } | null }>);

  if (queryResult.error || !queryResult.data?.length) {
    throw new Error('삭제할 레코드를 찾을 수 없습니다.');
  }

  const deleteResult = await ((supabase.from('ads_data_client_outbound') as unknown as { delete: () => unknown }).delete() as unknown as {
    eq: (col: string, val: number) => Promise<{ data: unknown; error: { message: string } | null }>;
  }).eq('id', queryResult.data[0].id);

  if (deleteResult.error) throw new Error(deleteResult.error.message);

  const remainResult = await (supabase
    .from('ads_data_client_outbound')
    .select('id')
    .eq('client_id', String(clientId))
    .limit(1) as unknown as Promise<{ data: { id: number }[] | null; error: unknown }>);

  if (!remainResult.data?.length) {
    await (supabase
      .from('ads_data_client')
      .update({ outbound: false })
      .eq('client_id', clientId) as unknown as Promise<{ data: unknown; error: unknown }>);
  }

  showToast('✅ 신규 광고주 해제 완료');
}

export function logOutboundError(context: string, err: unknown): void {
  devLog(`[Outbound Modal] ${context}:`, err);
}
