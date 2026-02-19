/**
 * DOM 요소 캐싱 시스템
 *
 * - preCacheCommonElements() / domCache.preCacheCommon(): 부트스트랩 시 공통 ID 미리 조회
 * - 요소 조회는 cache.ts의 getCachedElementById를 권장. 단축 함수 $()/ $q()는 레거시.
 */

import { devLog } from './utils';

interface CachedElement<T extends Element = Element> {
  element: T;
  timestamp: number;
}

class DOMCache {
  private cache = new Map<string, CachedElement>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000;

  getById<T extends HTMLElement = HTMLElement>(id: string): T | null {
    const cacheKey = `#${id}`;
    const cached = this.cache.get(cacheKey);
    if (cached && document.contains(cached.element)) return cached.element as T;
    const element = document.getElementById(id) as T | null;
    if (element) this.cache.set(cacheKey, { element, timestamp: Date.now() });
    else this.cache.delete(cacheKey);
    return element;
  }

  getBySelector<T extends Element = Element>(selector: string): T | null {
    const cacheKey = `qs:${selector}`;
    const cached = this.cache.get(cacheKey);
    if (cached && document.contains(cached.element)) return cached.element as T;
    const element = document.querySelector<T>(selector);
    if (element) this.cache.set(cacheKey, { element, timestamp: Date.now() });
    else this.cache.delete(cacheKey);
    return element;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    this.cache.delete(`#${key}`);
    this.cache.delete(`qs:${key}`);
  }

  invalidateByPrefix(prefix: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(prefix)) keysToDelete.push(key);
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  cleanup(): void {
    const keysToDelete: string[] = [];
    for (const [key, cached] of this.cache) {
      if (!document.contains(cached.element)) keysToDelete.push(key);
    }
    if (keysToDelete.length > 0) {
      devLog(`[DOMCache] Cleaning up ${keysToDelete.length} stale entries`);
      keysToDelete.forEach(key => this.cache.delete(key));
    }
  }

  clear(): void {
    this.cache.clear();
    devLog('[DOMCache] Cache cleared');
  }

  get size(): number {
    return this.cache.size;
  }

  preCacheCommon(): void {
    const commonIds = ['goal-register-modal', 'daily-tab', 'weekly-tab', 'sales-report-page', 'dashboard-page', 'goal-page', 'setting-page', 'manager-setting-page', 'dashboard-month-display', 'dashboard-prev-month', 'dashboard-next-month'];
    commonIds.forEach(id => this.getById(id));
    devLog(`[DOMCache] Pre-cached ${commonIds.length} common elements`);
  }
}

export const domCache = new DOMCache();

if (typeof setInterval !== 'undefined') {
  setInterval(() => domCache.cleanup(), 5 * 60 * 1000);
}

export function $(id: string): HTMLElement | null {
  return domCache.getById(id);
}

export function $q<T extends Element = Element>(selector: string): T | null {
  return domCache.getBySelector<T>(selector);
}
