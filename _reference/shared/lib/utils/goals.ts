/**
 * 목표 관련 계산 유틸리티 함수
 * 목표 달성률, 성장률 등의 계산을 수행합니다.
 */

import type { GoalMetricsInput, GoalMetricsResult, MetricColorClasses } from '@shared/types';

/**
 * 목표 관련 계산 결과를 반환하는 함수 (재계산 방지)
 */
export function calculateGoalMetrics(goal: GoalMetricsInput): GoalMetricsResult {
  const startRevenue = goal.start_revenue ?? 0;
  const goalRevenue = goal.goal_revenue ?? 0;
  const currentRevenue = goal.currentRevenue ?? 0;

  const targetGrowth = goalRevenue - startRevenue;
  const actualGrowth = currentRevenue - startRevenue;

  const achievementRate = goalRevenue > 0
    ? Math.round((currentRevenue / goalRevenue) * 100)
    : 0;

  const achievementRateDecimal = goalRevenue > 0
    ? Math.round((currentRevenue / goalRevenue) * 100 * 10) / 10
    : 0;

  const growthRate = startRevenue > 0
    ? Math.round((actualGrowth / startRevenue) * 100 * 10) / 10
    : 0;

  const growthRatePercent = startRevenue > 0
    ? Math.round(((goalRevenue / startRevenue) - 1) * 100)
    : 0;

  let achievedColorClass = 'achieved-low';
  if (achievementRateDecimal >= 110) {
    achievedColorClass = 'achieved-excellent';
  } else if (achievementRateDecimal >= 100) {
    achievedColorClass = 'achieved-high';
  } else if (achievementRateDecimal >= 90) {
    achievedColorClass = 'achieved-mid';
  }

  const growthRateColorClass = growthRate >= 0 ? 'growth-positive' : 'growth-negative';

  let colorClass = 'achievement-low';
  let bgClass = 'bg-low';
  if (achievementRate >= 100) {
    colorClass = 'achievement-high';
    bgClass = 'bg-high';
  } else if (achievementRate >= 80) {
    colorClass = 'achievement-mid';
    bgClass = 'bg-mid';
  }

  return {
    startRevenue,
    goalRevenue,
    currentRevenue,
    targetGrowth,
    actualGrowth,
    achievementRate,
    achievementRateDecimal,
    growthRate,
    growthRatePercent,
    achievedColorClass,
    growthRateColorClass,
    colorClass,
    bgClass,
  };
}

/**
 * 달성률에 따른 통합 색상 클래스 반환
 */
export function getAchievementColorClass(achievementRate: number): string {
  if (achievementRate < 80) return 'metric-achievement-under80';
  if (achievementRate < 90) return 'metric-achievement-under90';
  if (achievementRate < 100) return 'metric-achievement-under100';
  if (achievementRate < 110) return 'metric-achievement-over100';
  if (achievementRate < 120) return 'metric-achievement-over110';
  return 'metric-achievement-over120';
}

/**
 * 각 메트릭별 달성률 클래스 계산
 */
export function getMetricColorClasses(
  goal: GoalMetricsInput,
  metrics: GoalMetricsResult
): MetricColorClasses {
  const {
    goalRevenue,
    currentRevenue,
    targetGrowth,
    actualGrowth,
    growthRate,
    achievementRateDecimal,
  } = metrics;

  const achievedRevenueRate = goalRevenue > 0 ? (currentRevenue / goalRevenue) * 100 : 0;

  let achievedGrowthRate: number;
  if (targetGrowth === 0) {
    achievedGrowthRate = actualGrowth < 0 ? 85 : 115;
  } else {
    achievedGrowthRate = (actualGrowth / targetGrowth) * 100;
  }

  const weeklyGrowthRate = 100 + growthRate;
  const goalAchievementRate = achievementRateDecimal;

  return {
    achievedRevenueClass: getAchievementColorClass(achievedRevenueRate),
    achievedGrowthClass: getAchievementColorClass(achievedGrowthRate),
    weeklyGrowthClass: getAchievementColorClass(weeklyGrowthRate),
    goalAchievementClass: getAchievementColorClass(goalAchievementRate),
  };
}
