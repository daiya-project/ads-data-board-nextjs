/**
 * 라우트 정의 — 페이지별 동적 import (코드 스플리팅)
 */

export type FeatureLoader =
  | (() => Promise<typeof import('../../dashboard')>)
  | (() => Promise<typeof import('../../reports')>)
  | (() => Promise<typeof import('../../goal-monthly')>)
  | (() => Promise<typeof import('../../goal-weekly')>)
  | (() => Promise<typeof import('../../settings')>);

/** 페이지 ID (data-page) */
export type PageId = 'dashboard' | 'sales-report' | 'goal' | 'setting';

/** 라우트 키: pageId 또는 pageId/subPageId */
export function routeKey(pageId: string, subPageId?: string): string {
  return subPageId ? `${pageId}/${subPageId}` : pageId;
}

/**
 * 페이지별 Feature 동적 로더.
 * 실제 로드는 router에서 필요 시에만 호출하여 코드 스플리팅 적용.
 */
export const featureLoaders: Record<string, FeatureLoader> = {
  dashboard: () => import('../../dashboard'),
  'sales-report': () => import('../../reports'),
  'sales-report/daily': () => import('../../reports'),
  'sales-report/weekly': () => import('../../reports'),
  'goal/monthly': () => import('../../goal-monthly'),
  'goal/weekly': () => import('../../goal-weekly'),
  'setting/goal-setting': () => import('../../settings'),
  'setting/manager-setting': () => import('../../settings'),
};
