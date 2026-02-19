/**
 * Goal Monthly — MA 차트 지표별 fetch 캐시
 *
 * (managerId, metric) 키로 뷰 행 배열 캐시. 토글 시 재요청 감소.
 * TTL 5분. cleanupMaChartRevenueSection 호출 시 전체 무효화.
 */

export type MaChartMetric = 'rev' | 'vctr' | 'cvr' | 'cpc';

const TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  rows: unknown[];
  ts: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(managerId: number | null, metric: MaChartMetric): string {
  return `ma_${managerId ?? 'all'}_${metric}`;
}

export function getCachedRows<T>(
  managerId: number | null,
  metric: MaChartMetric
): T[] | null {
  const key = cacheKey(managerId, metric);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.rows as T[];
}

export function setCachedRows(
  managerId: number | null,
  metric: MaChartMetric,
  rows: unknown[]
): void {
  cache.set(cacheKey(managerId, metric), { rows, ts: Date.now() });
}

/** 필터 변경·페이지 이탈 시 호출. MA 차트 캐시 전체 무효화. */
export function clearMaChartCache(): void {
  cache.clear();
}
