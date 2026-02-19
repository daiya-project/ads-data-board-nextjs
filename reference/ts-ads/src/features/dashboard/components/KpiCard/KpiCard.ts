/**
 * Dashboard KPI 카드 — JS-First 렌더링
 * _backup/index.html L138~L224, L232~L339 참조
 */

import './KpiCard.css';

export type KpiVariant = 'daily' | 'weekly' | 'monthly' | 'expected';

const LABELS: Record<KpiVariant, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  expected: 'Expected Monthly',
};

const ICONS: Record<KpiVariant, string> = {
  daily: '📅',
  weekly: '📊',
  monthly: '📈',
  expected: '🎯',
};

export interface KpiCardOptions {
  idPrefix: string;
  variant: KpiVariant;
}

export class KpiCard {
  private root: HTMLElement | null = null;

  constructor(private options: KpiCardOptions) {}

  render(container: HTMLElement): void {
    const { idPrefix, variant } = this.options;
    const label = LABELS[variant];
    const icon = ICONS[variant];

    if (variant === 'daily' || variant === 'weekly') {
      const html = `
        <div class="KpiCard">
          <div class="KpiCard__header">
            <h3>${label}</h3>
            <div class="KpiCard__icon">${icon}</div>
          </div>
          <div class="KpiCard__mainContent">
            <div class="KpiCard__value" id="${idPrefix}-${variant === 'daily' ? 'daily' : 'weekly'}-current">0</div>
            <div class="KpiCard__comparison">
              <span class="KpiCard__comparisonLabel">${variant === 'daily' ? '전일' : '전주'}</span>
              <span class="KpiCard__comparisonValue" id="${idPrefix}-${variant === 'daily' ? 'daily' : 'weekly'}-previous">0</span>
            </div>
          </div>
          <div class="KpiCard__changeGroup">
            <span class="KpiCard__changeAmount" id="${idPrefix}-${variant === 'daily' ? 'daily' : 'weekly'}-change-amount">0</span>
            <span class="KpiCard__change" id="${idPrefix}-${variant === 'daily' ? 'daily' : 'weekly'}-change-rate">0%</span>
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', html);
    } else {
      const progressLabels =
        variant === 'monthly'
          ? [
              { key: 'progress', label: '월 경과율' },
              { key: 'achievement', label: '달성율' },
            ]
          : [
              { key: 'goal', label: '목표 매출' },
              { key: 'achievement', label: '예상 달성율' },
            ];
      const valueId =
        variant === 'monthly'
          ? `${idPrefix}-monthly-cumulative`
          : `${idPrefix}-expected-revenue`;
      const suffix = variant === 'monthly' ? 'monthly' : 'expected';
      const progressHtml = progressLabels
        .map(
          (p) => `
        <div class="KpiCard__progressItem">
          <span class="KpiCard__progressLabel">${p.label}</span>
          <span class="KpiCard__progressValue" id="${idPrefix}-${suffix}-${p.key}">0${p.key === 'achievement' || p.key === 'progress' ? '%' : ''}</span>
        </div>
      `
        )
        .join('');
      const html = `
        <div class="KpiCard">
          <div class="KpiCard__header">
            <h3>${label}</h3>
            <div class="KpiCard__icon">${icon}</div>
          </div>
          <div class="KpiCard__mainContent">
            <div class="KpiCard__value" id="${valueId}">0</div>
            <div class="KpiCard__progressInfo">
              ${progressHtml}
            </div>
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', html);
    }
    this.root = container.lastElementChild as HTMLElement;
  }

  destroy(): void {
    this.root?.remove();
    this.root = null;
  }
}
