/**
 * 상수 정의
 */

import type { ActionStatusKey, CategoryKey } from '@shared/types';

export const ACTION_STATUS_CONFIG: Record<
  ActionStatusKey,
  { icon: string; color: string }
> = {
  progress: { icon: 'ri-loader-4-line', color: '#3b82f6' },
  done: { icon: 'ri-check-line', color: '#10b981' },
  failed: { icon: 'ri-close-line', color: '#ef4444' },
};

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  upsales_big: '업세일 - 고래',
  upsales_smb: '업세일 - SMB',
  new: '신규',
  outbound: '아웃바운드',
  etc: '기타',
};

/** goal_category 정렬 순서 (드롭다운·카드 순서에 공통 사용) */
export const CATEGORY_ORDER: Record<string, number> = {
  upsales_big: 0,
  upsales_smb: 1,
  new: 2,
  outbound: 3,
  etc: 4,
};
