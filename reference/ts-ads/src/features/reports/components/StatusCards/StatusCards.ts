/**
 * StatusCards — 5 status cards (active, new, stopped, rising, falling)
 * Renders DOM with IDs expected by existing updateDailyStatusCards / updateWeeklyStatusCards.
 */

import './StatusCards.css';

export type TabKind = 'daily' | 'weekly';

const CARD_DEFS: Array<{
  status: string;
  label: string;
  iconClass: string;
  activeCountOnly?: boolean;
}> = [
  { status: 'active', label: 'Active Client', iconClass: 'ri-user-star-fill', activeCountOnly: true },
  { status: 'new', label: 'New Clients', iconClass: 'ri-sparkling-fill' },
  { status: 'stopped', label: 'Stopped', iconClass: 'ri-pause-circle-fill' },
  { status: 'rising', label: 'Revenue Up', iconClass: 'ri-arrow-right-up-line' },
  { status: 'falling', label: 'Revenue Down', iconClass: 'ri-arrow-right-down-line' },
];

function idPrefix(kind: TabKind): string {
  return kind === 'daily' ? 'summary' : 'weekly-summary';
}

export class StatusCards {
  private root: HTMLElement | null = null;

  constructor(private kind: TabKind) {}

  render(container: HTMLElement): void {
    const prefix = idPrefix(this.kind);
    const html = `
      <div class="StatusCards__grid">
        ${CARD_DEFS.map(
          (def) => `
          <div class="StatusCards__card StatusCards__card--${def.status}" data-status="${def.status}">
            <div class="StatusCards__icon">
              <i class="${def.iconClass}"></i>
            </div>
            <div class="StatusCards__info">
              <span class="StatusCards__label">${def.label}</span>
              <div class="StatusCards__metrics">
                ${def.activeCountOnly ? `<span class="StatusCards__count" id="${prefix}-active-count">0 → 0</span>` : `<span class="StatusCards__count" id="${prefix}-${def.status}-count">0</span><span class="StatusCards__amount" id="${prefix}-${def.status}-amount">₩0</span>`}
              </div>
            </div>
          </div>
        `
        ).join('')}
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
