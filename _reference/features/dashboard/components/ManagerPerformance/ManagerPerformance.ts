/**
 * Dashboard 매니저별 KPI + 차트 영역 — JS-First
 * _backup/index.html L232~L339
 */

import { KpiCard } from '../KpiCard';
import './ManagerPerformance.css';

export class ManagerPerformance {
  private kpiCards: KpiCard[] = [];
  private managerGrid: HTMLElement | null = null;
  private managerChartCard: HTMLElement | null = null;

  render(container: HTMLElement): void {
    const grid = document.createElement('div');
    grid.className = 'KpiCard__grid';
    grid.id = 'manager-kpi-grid';
    this.managerGrid = grid;

    const variants: Array<'daily' | 'weekly' | 'monthly' | 'expected'> = [
      'daily',
      'weekly',
      'monthly',
      'expected',
    ];
    this.kpiCards = variants.map(
      (v) => new KpiCard({ idPrefix: 'manager', variant: v })
    );
    this.kpiCards.forEach((card) => card.render(grid));
    container.appendChild(grid);

    const chartCard = document.createElement('div');
    chartCard.className = 'RevenueChart__card';
    chartCard.innerHTML = `
      <div class="ManagerPerformance__header">
        <h3>Manager Performance</h3>
        <div class="Dropdown Dropdown--pill" id="manager-chart-dropdown">
          <button type="button" class="Dropdown__trigger" id="manager-chart-trigger">
            <span class="Dropdown__value" id="manager-chart-value">All</span>
            <i class="ri-arrow-down-s-line Dropdown__chevron"></i>
          </button>
          <div class="Dropdown__menu" id="manager-chart-menu">
            <div class="Dropdown__item active" data-value="">All</div>
          </div>
        </div>
      </div>
      <div class="RevenueChart__container">
        <div class="RevenueChart__wrapper RevenueChart__wrapper--monthly">
          <canvas id="manager-monthly-chart"></canvas>
        </div>
        <div class="RevenueChart__wrapper RevenueChart__wrapper--weekly">
          <canvas id="manager-weekly-chart"></canvas>
        </div>
      </div>
    `;
    this.managerChartCard = chartCard;
    container.appendChild(chartCard);
  }

  destroy(): void {
    this.kpiCards.forEach((c) => c.destroy());
    this.kpiCards = [];
    this.managerGrid?.remove();
    this.managerGrid = null;
    this.managerChartCard?.remove();
    this.managerChartCard = null;
  }
}
