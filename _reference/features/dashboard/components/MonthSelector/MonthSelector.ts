/**
 * Dashboard 월 선택 UI (‹ 2026. 01 › + 모달)
 * _backup/index.html L127~L137, L340~L349
 */

import './MonthSelector.css';

export class MonthSelector {
  private root: HTMLElement | null = null;

  render(container: HTMLElement): void {
    const html = `
      <div class="MonthSelector__controller">
        <div class="MonthSelector__pill">
          <button type="button" class="MonthSelector__pillBtn" id="dashboard-month-prev" aria-label="이전 달">
            <i class="ri-arrow-left-s-line"></i>
          </button>
          <span class="MonthSelector__pillDisplay" id="dashboard-month-display">–</span>
          <button type="button" class="MonthSelector__pillBtn" id="dashboard-month-next" aria-label="다음 달">
            <i class="ri-arrow-right-s-line"></i>
          </button>
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
