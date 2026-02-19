/**
 * ReportFilters — search input + clear button + manager select
 * Renders DOM with IDs expected by setupDailyReportFilters / setupWeeklyReportFilters.
 */

import './ReportFilters.css';
import type { TabKind } from '../StatusCards';

export class ReportFilters {
  private root: HTMLElement | null = null;

  constructor(private kind: TabKind) {}

  /** Appends the report-filters block into container (caller should use a report-section as container). */
  render(container: HTMLElement): void {
    const prefix = this.kind === 'daily' ? 'daily' : 'weekly';
    const html = `
      <div class="ReportFilters__filters">
        <div class="ReportFilters__filterGroup">
          <div class="ReportFilters__searchWrapper">
            <input type="text" id="${prefix}-search-input" class="ReportFilters__searchInput" placeholder="Client 검색...">
            <button type="button" class="ReportFilters__searchClearBtn" id="${prefix}-search-clear" style="display: none;">✕</button>
          </div>
        </div>
        <div class="ReportFilters__filterGroup">
          <select id="${prefix}-manager-filter" class="ReportFilters__managerSelect">
            <option value="">담당자</option>
          </select>
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
