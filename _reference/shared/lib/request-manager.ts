/**
 * 요청 중복 제거 시스템
 */

import { devLog } from './utils';

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

interface CachedResult<T> {
  data: T;
  timestamp: number;
}

interface RequestOptions {
  cacheTtl?: number;
  forceRefresh?: boolean;
}

class RequestManager {
  private pending = new Map<string, PendingRequest<unknown>>();
  private cache = new Map<string, CachedResult<unknown>>();

  async execute<T>(key: string, fetcher: () => Promise<T>, options: RequestOptions = {}): Promise<T> {
    const { cacheTtl = 0, forceRefresh = false } = options;

    if (!forceRefresh && cacheTtl > 0) {
      const cached = this.cache.get(key) as CachedResult<T> | undefined;
      if (cached && Date.now() - cached.timestamp < cacheTtl) {
        devLog(`[RequestManager] Cache hit: ${key}`);
        return cached.data;
      }
    }

    const pendingRequest = this.pending.get(key) as PendingRequest<T> | undefined;
    if (pendingRequest) {
      devLog(`[RequestManager] Deduplicating request: ${key}`);
      return pendingRequest.promise;
    }

    devLog(`[RequestManager] Executing request: ${key}`);
    const promise = fetcher();
    this.pending.set(key, { promise: promise as Promise<unknown>, timestamp: Date.now() });

    try {
      const result = await promise;
      if (cacheTtl > 0) {
        this.cache.set(key, { data: result, timestamp: Date.now() });
      }
      return result;
    } finally {
      this.pending.delete(key);
    }
  }

  invalidateCache(key: string): void {
    this.cache.delete(key);
    devLog(`[RequestManager] Cache invalidated: ${key}`);
  }

  invalidateCacheByPrefix(prefix: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) keysToDelete.push(key);
    }
    keysToDelete.forEach(key => this.cache.delete(key));
    if (keysToDelete.length > 0) devLog(`[RequestManager] Invalidated ${keysToDelete.length} cache entries with prefix: ${prefix}`);
  }

  clearCache(): void {
    const count = this.cache.size;
    this.cache.clear();
    devLog(`[RequestManager] Cleared ${count} cache entries`);
  }

  isPending(key: string): boolean {
    return this.pending.has(key);
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  get cacheSize(): number {
    return this.cache.size;
  }

  cleanupExpiredCache(maxAge: number = 10 * 60 * 1000): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    for (const [key, cached] of this.cache) {
      if (now - cached.timestamp > maxAge) keysToDelete.push(key);
    }
    keysToDelete.forEach(key => this.cache.delete(key));
    if (keysToDelete.length > 0) devLog(`[RequestManager] Cleaned up ${keysToDelete.length} expired cache entries`);
  }
}

export const requestManager = new RequestManager();

if (typeof setInterval !== 'undefined') {
  setInterval(() => requestManager.cleanupExpiredCache(), 10 * 60 * 1000);
}

export function createRequestKey(prefix: string, ...params: (string | number | undefined | null)[]): string {
  return `${prefix}:${params.filter(p => p != null).join(':')}`;
}
