/**
 * Supabase 서비스
 * Supabase 클라이언트 관련 유틸리티 함수를 제공합니다.
 */

import type { SupabaseClient } from '@shared/types';

declare global {
  interface Window {
    supabase?: SupabaseClient;
  }
}

/**
 * Supabase 클라이언트를 가져옵니다 (필수).
 * 클라이언트가 초기화되지 않은 경우 에러를 발생시킵니다.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!window.supabase) {
    throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
  }
  return window.supabase;
}

/**
 * Supabase 클라이언트를 안전하게 가져옵니다 (선택적).
 * 클라이언트가 초기화되지 않은 경우 null을 반환합니다.
 */
export function getSupabaseClientSafe(): SupabaseClient | null {
  if (!window.supabase) {
    return null;
  }
  return window.supabase;
}
