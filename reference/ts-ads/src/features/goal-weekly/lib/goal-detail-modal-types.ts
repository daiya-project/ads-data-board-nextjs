/**
 * Goal Detail Modal - 타입 정의
 */

import type { GoalBase, ActionItemRow, GoalMetricsResult } from '@shared/types';

export interface CachedGoalDetail {
  goal: GoalBase;
  clients: { id: number; name: string }[];
  actionItems: ActionItemRow[];
  detailMetrics: GoalMetricsResult;
  categoryLabel: string;
  descriptionText: string;
  dateRangeStr: string;
  totalCount: number;
  clientNames: string[];
}

export interface OpenGoalDetailModalOptions {
  /** 8차: 경쟁 방지 — 반환 false면 렌더 생략 */
  checkRace?: (goalId: number) => boolean;
}
