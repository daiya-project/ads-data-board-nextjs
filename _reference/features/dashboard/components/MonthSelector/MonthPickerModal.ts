/**
 * Dashboard 월 선택 모달
 * _backup/index.html L340~L349
 */

import './MonthSelector.css';

export class MonthPickerModal {
  private root: HTMLElement | null = null;

  render(container: HTMLElement): void {
    const html = `
      <div id="dashboard-month-picker-modal" class="MonthSelector__pickerOverlay" style="display: none;">
        <div class="MonthSelector__pickerModal">
          <div class="MonthSelector__pickerHeader">
            <span>월 선택</span>
            <select id="dashboard-month-picker-year"></select>
          </div>
          <div class="MonthSelector__pickerBody" id="dashboard-month-picker-body"></div>
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
