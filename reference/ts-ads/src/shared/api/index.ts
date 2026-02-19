/**
 * shared/api 배럴
 * Supabase 클라이언트 및 공통 API(repository) re-export
 */

export { getSupabaseClient, getSupabaseClientSafe } from './supabase-client';
export {
  getManagerList,
  getClientList,
  invalidateClientCache,
  invalidateManagerCache,
} from './api';
