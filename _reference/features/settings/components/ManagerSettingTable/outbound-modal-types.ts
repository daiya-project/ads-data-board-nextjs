/**
 * Outbound Setting Modal - 타입 정의
 */

export interface OutboundRecord {
  id: number;
  client_id: number;
  outbound_start: string;
  outbound_end: string;
  created_at: string;
}

/** Manager Setting 리로드 콜백 (manager-setting-types에서 통일 정의) */
export type { LoadManagerSettingFn } from './manager-setting-types';
