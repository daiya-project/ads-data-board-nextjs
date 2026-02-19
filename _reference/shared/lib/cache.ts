/**
 * 캐싱 시스템
 *
 * - 데이터 캐시: shared_manager, clients, goalDetails 등
 * - DOM 캐시: getCachedElementById / getCachedElement / getCachedElements
 *   → DOM 요소 조회 시 권장 API. 신규 코드는 이 계층을 사용할 것.
 */

interface CacheEntry<T = unknown> {
  data: T | null;
  timestamp: number | null;
  ttl?: number;
}

export const cache = {
  shared_manager: { data: null as unknown[] | null, timestamp: null as number | null, ttl: 5 * 60 * 1000 } as CacheEntry<unknown[]>,
  clients: new Map<string, CacheEntry<unknown[]>>(),
  clientTtl: 5 * 60 * 1000,
  dailyReport: { data: null as unknown, dateRange: null as unknown, timestamp: null as number | null, ttl: 2 * 60 * 1000 },
  weeklyReport: { data: null as unknown, weeks: null as unknown, timestamp: null as number | null, ttl: 2 * 60 * 1000 },
  holidays: { data: null as unknown, dateRange: null as unknown, timestamp: null as number | null, ttl: 24 * 60 * 60 * 1000 },
  goalDetails: new Map<number, CacheEntry>(),
  goalDetailTtl: 1 * 60 * 1000,
  actionItems: new Map<number, CacheEntry>(),
  actionItemsTtl: 1 * 60 * 1000,
  domElements: new Map<string, Element | Element[]>(),
};

export function isCacheValid(cacheEntry: CacheEntry | null | undefined, ttl: number): boolean {
  if (!cacheEntry || !cacheEntry.timestamp) return false;
  return Date.now() - cacheEntry.timestamp < ttl;
}

export function invalidateCache(cacheKey: string, cacheMap: Map<string, unknown> | null): void {
  if (cacheMap && cacheMap.has(cacheKey)) cacheMap.delete(cacheKey);
}

export function cleanupExpiredCache(): void {
  for (const [key, entry] of cache.clients) {
    if (!isCacheValid(entry, cache.clientTtl)) cache.clients.delete(key);
  }
  for (const [key, entry] of cache.goalDetails) {
    if (!isCacheValid(entry, cache.goalDetailTtl)) cache.goalDetails.delete(key);
  }
  for (const [key, entry] of cache.actionItems) {
    if (!isCacheValid(entry, cache.actionItemsTtl)) cache.actionItems.delete(key);
  }
  for (const [key, element] of cache.domElements) {
    if (!element || !(element instanceof Node) || !document.contains(element)) cache.domElements.delete(key);
  }
}

export function getCachedElement(selector: string): Element | null {
  if (cache.domElements.has(selector)) {
    const element = cache.domElements.get(selector);
    if (element && element instanceof Node && document.contains(element)) return element as Element;
    cache.domElements.delete(selector);
  }
  const element = document.querySelector(selector);
  if (element) cache.domElements.set(selector, element);
  return element;
}

export function getCachedElementById(id: string): HTMLElement | null {
  return getCachedElement(`#${id}`) as HTMLElement | null;
}

export function getCachedElements(selector: string, useNodeList = false): Element[] | NodeListOf<Element> {
  const cacheKey = `all:${selector}`;
  if (cache.domElements.has(cacheKey)) {
    const elements = cache.domElements.get(cacheKey) as Element[] | undefined;
    if (elements && elements.length > 0 && document.contains(elements[0])) {
      return useNodeList ? (elements as unknown as NodeListOf<Element>) : elements;
    }
    cache.domElements.delete(cacheKey);
  }
  const nodeList = document.querySelectorAll(selector);
  const elements = useNodeList ? nodeList : Array.from(nodeList);
  if (elements.length > 0) cache.domElements.set(cacheKey, elements);
  return elements;
}

export function preCacheCommonElements(): void {
  const commonSelectors = ['goal-register-modal', 'daily-tab', 'weekly-tab', 'sales-report-page', 'dashboard-page', 'goal-page', 'setting-page', 'manager-setting-page'];
  commonSelectors.forEach(id => getCachedElementById(id));
  const commonClassSelectors = ['.Sidebar__navItem', '.page', '.tab-content'];
  commonClassSelectors.forEach(selector => getCachedElements(selector));
}

if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredCache, 5 * 60 * 1000);
}
