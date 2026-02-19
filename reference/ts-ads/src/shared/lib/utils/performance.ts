/**
 * 성능 모니터링 시스템
 */

import { devLog } from './devlog';

interface PerformanceEntry {
  key: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

interface PerformanceStats {
  key: string;
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  lastDuration: number;
}

interface ThresholdConfig {
  warning: number;
  critical: number;
}

class PerformanceMonitorClass {
  private static instance: PerformanceMonitorClass;
  private activeEntries: Map<string, PerformanceEntry> = new Map();
  private completedEntries: PerformanceEntry[] = [];
  private stats: Map<string, PerformanceStats> = new Map();
  private thresholds: Map<string, ThresholdConfig> = new Map();
  private defaultThreshold: ThresholdConfig = { warning: 1000, critical: 3000 };
  private maxEntries: number = 100;
  private enabled: boolean = true;

  private constructor() {}

  static getInstance(): PerformanceMonitorClass {
    if (!PerformanceMonitorClass.instance) {
      PerformanceMonitorClass.instance = new PerformanceMonitorClass();
    }
    return PerformanceMonitorClass.instance;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  start(key: string, metadata?: Record<string, unknown>): void {
    if (!this.enabled) return;
    this.activeEntries.set(key, { key, startTime: performance.now(), metadata });
    devLog(`[Performance] 시작: ${key}`);
  }

  end(key: string): number {
    if (!this.enabled) return -1;
    const entry = this.activeEntries.get(key);
    if (!entry) {
      devLog(`[Performance] 경고: ${key} 측정이 시작되지 않았습니다`);
      return -1;
    }
    entry.endTime = performance.now();
    entry.duration = entry.endTime - entry.startTime;
    this.activeEntries.delete(key);
    this.completedEntries.push(entry);
    if (this.completedEntries.length > this.maxEntries) this.completedEntries.shift();
    const duration = entry.duration;
    let stats = this.stats.get(key);
    if (!stats) {
      stats = { key, count: 0, totalDuration: 0, avgDuration: 0, minDuration: Infinity, maxDuration: 0, lastDuration: 0 };
      this.stats.set(key, stats);
    }
    stats.count++;
    stats.totalDuration += duration;
    stats.avgDuration = stats.totalDuration / stats.count;
    stats.minDuration = Math.min(stats.minDuration, duration);
    stats.maxDuration = Math.max(stats.maxDuration, duration);
    stats.lastDuration = duration;
    const threshold = this.thresholds.get(key) || this.defaultThreshold;
    if (duration >= threshold.critical) console.warn(`🚨 [Performance Critical] ${key}: ${duration.toFixed(2)}ms`);
    else if (duration >= threshold.warning) console.warn(`⚠️ [Performance Warning] ${key}: ${duration.toFixed(2)}ms`);
    devLog(`[Performance] 종료: ${key} (${duration.toFixed(2)}ms)`);
    return duration;
  }

  async measure<T>(key: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T> {
    this.start(key, metadata);
    try {
      return await fn();
    } finally {
      this.end(key);
    }
  }

  measureSync<T>(key: string, fn: () => T, metadata?: Record<string, unknown>): T {
    this.start(key, metadata);
    try {
      return fn();
    } finally {
      this.end(key);
    }
  }

  setThreshold(key: string, config: ThresholdConfig): void {
    this.thresholds.set(key, config);
  }

  setDefaultThreshold(config: ThresholdConfig): void {
    this.defaultThreshold = config;
  }

  getStats(key: string): PerformanceStats | null {
    return this.stats.get(key) || null;
  }

  getAllStats(): PerformanceStats[] {
    return Array.from(this.stats.values());
  }

  getRecentEntries(limit: number = 20): PerformanceEntry[] {
    return this.completedEntries.slice(-limit);
  }

  getSlowOperations(): PerformanceEntry[] {
    return this.completedEntries.filter(entry => {
      const threshold = this.thresholds.get(entry.key) || this.defaultThreshold;
      return (entry.duration || 0) >= threshold.warning;
    });
  }

  generateReport(): {
    totalMeasurements: number;
    slowOperations: number;
    criticalOperations: number;
    stats: PerformanceStats[];
    recentEntries: PerformanceEntry[];
  } {
    const slowOps = this.getSlowOperations();
    const criticalOps = this.completedEntries.filter(entry => {
      const threshold = this.thresholds.get(entry.key) || this.defaultThreshold;
      return (entry.duration || 0) >= threshold.critical;
    });
    return {
      totalMeasurements: this.completedEntries.length,
      slowOperations: slowOps.length,
      criticalOperations: criticalOps.length,
      stats: this.getAllStats(),
      recentEntries: this.getRecentEntries()
    };
  }

  logReport(): void {
    const report = this.generateReport();
    console.group('📊 Performance Report');
    console.log(`Total measurements: ${report.totalMeasurements}`);
    console.log(`Slow operations: ${report.slowOperations}`);
    console.log(`Critical operations: ${report.criticalOperations}`);
    if (report.stats.length > 0) {
      console.table(report.stats.map(s => ({ Key: s.key, Count: s.count, 'Avg (ms)': s.avgDuration.toFixed(2) })));
    }
    console.groupEnd();
  }

  clear(): void {
    this.activeEntries.clear();
    this.completedEntries = [];
    this.stats.clear();
    devLog('[Performance] 모든 데이터 초기화됨');
  }

  cancel(key: string): void {
    if (this.activeEntries.has(key)) {
      this.activeEntries.delete(key);
      devLog(`[Performance] 취소: ${key}`);
    }
  }
}

export const PerformanceMonitor = PerformanceMonitorClass.getInstance();

export function withPerformanceTracking<T extends (...args: unknown[]) => Promise<unknown>>(key: string, fn: T): T {
  return (async (...args: unknown[]) => PerformanceMonitor.measure(key, () => fn(...args))) as T;
}

export class FrameRateMonitor {
  private frameCount: number = 0;
  private lastTime: number = 0;
  private fps: number = 0;
  private rafId: number | null = null;
  private onUpdate?: (fps: number) => void;

  start(onUpdate?: (fps: number) => void): void {
    this.onUpdate = onUpdate;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.tick();
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  getFPS(): number {
    return this.fps;
  }

  private tick = (): void => {
    this.frameCount++;
    const currentTime = performance.now();
    const elapsed = currentTime - this.lastTime;
    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastTime = currentTime;
      if (this.onUpdate) this.onUpdate(this.fps);
      devLog(`[FPS] ${this.fps}`);
    }
    this.rafId = requestAnimationFrame(this.tick);
  };
}

export function getMemoryUsage(): { usedJSHeapSize: number; totalJSHeapSize: number } | null {
  // @ts-expect-error: Chrome-specific API
  const memory = performance.memory;
  if (memory) return { usedJSHeapSize: memory.usedJSHeapSize, totalJSHeapSize: memory.totalJSHeapSize };
  return null;
}

export function measureNetworkTiming(resourceName: string): PerformanceResourceTiming | null {
  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  return entries.find(entry => entry.name.includes(resourceName)) || null;
}

export function getPageLoadTiming(): {
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number | null;
  firstContentfulPaint: number | null;
} | null {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const paintEntries = performance.getEntriesByType('paint');
  if (!navigation) return null;
  const firstPaint = paintEntries.find(e => e.name === 'first-paint');
  const firstContentfulPaint = paintEntries.find(e => e.name === 'first-contentful-paint');
  return {
    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
    loadComplete: navigation.loadEventEnd - navigation.startTime,
    firstPaint: firstPaint ? firstPaint.startTime : null,
    firstContentfulPaint: firstContentfulPaint ? firstContentfulPaint.startTime : null
  };
}
