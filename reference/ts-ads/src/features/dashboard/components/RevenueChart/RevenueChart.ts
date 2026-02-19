/**
 * Dashboard 월/주 차트 영역 — JS-First
 * _backup/index.html L225~L231
 */

import './RevenueChart.css';

export class RevenueChart {
  private root: HTMLElement | null = null;

  render(container: HTMLElement): void {
    const html = `
      <div class="RevenueChart__card">
        <h3>Monthly Revenue</h3>
        <div class="RevenueChart__container">
          <div class="RevenueChart__wrapper RevenueChart__wrapper--monthly">
            <canvas id="monthly-chart"></canvas>
          </div>
          <div class="RevenueChart__wrapper RevenueChart__wrapper--weekly">
            <canvas id="weekly-chart"></canvas>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    this.root = container.lastElementChild as HTMLElement;
  }

  destroy(): void {
    this.root?.remove();
    this.root = null;
  }
}
