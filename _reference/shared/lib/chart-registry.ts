/**
 * 차트 레지스트리 시스템
 */

import { devLog } from './utils';

interface ChartInstance {
  destroy: () => void;
  update: (mode?: string) => void;
  resize: () => void;
  canvas: HTMLCanvasElement;
}

class ChartRegistry {
  private charts = new Map<string, ChartInstance>();

  register(id: string, chart: ChartInstance): void {
    this.destroy(id);
    this.charts.set(id, chart);
    devLog(`[ChartRegistry] Registered chart: ${id}`);
  }

  get(id: string): ChartInstance | undefined {
    return this.charts.get(id);
  }

  has(id: string): boolean {
    return this.charts.has(id);
  }

  destroy(id: string): void {
    const chart = this.charts.get(id);
    if (chart) {
      try {
        chart.destroy();
        devLog(`[ChartRegistry] Destroyed chart: ${id}`);
      } catch (error) {
        devLog(`[ChartRegistry] Error destroying chart ${id}:`, error);
      }
      this.charts.delete(id);
    }
  }

  destroyByPrefix(prefix: string): void {
    const idsToDestroy: string[] = [];
    for (const id of this.charts.keys()) {
      if (id.startsWith(prefix)) idsToDestroy.push(id);
    }
    idsToDestroy.forEach(id => this.destroy(id));
    if (idsToDestroy.length > 0) devLog(`[ChartRegistry] Destroyed ${idsToDestroy.length} charts with prefix: ${prefix}`);
  }

  destroyAll(): void {
    const count = this.charts.size;
    for (const [, chart] of this.charts) {
      try { chart.destroy(); } catch (error) { /* ignore */ }
    }
    this.charts.clear();
    devLog(`[ChartRegistry] Destroyed all ${count} charts`);
  }

  get size(): number {
    return this.charts.size;
  }

  getIds(): string[] {
    return Array.from(this.charts.keys());
  }

  update(id: string, mode?: string): void {
    const chart = this.charts.get(id);
    if (chart) {
      try { chart.update(mode); } catch (error) { devLog(`[ChartRegistry] Error updating chart ${id}:`, error); }
    }
  }

  resizeAll(): void {
    for (const [id, chart] of this.charts) {
      try { chart.resize(); } catch (error) { devLog(`[ChartRegistry] Error resizing chart ${id}:`, error); }
    }
  }
}

export const chartRegistry = new ChartRegistry();

let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => chartRegistry.resizeAll(), 250);
  });
}
