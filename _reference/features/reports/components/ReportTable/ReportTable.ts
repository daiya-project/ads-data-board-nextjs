/**
 * ReportTable — table placeholder with thead/tbody IDs for existing load/render logic.
 * Appends report-table-container into the given container (report-section).
 */

import './ReportTable.css';
import type { TabKind } from '../StatusCards';

export class ReportTable {
  private root: HTMLElement | null = null;

  constructor(private kind: TabKind) {}

  /** Appends the report-table-container (with table) into container. */
  render(container: HTMLElement): void {
    const prefix = this.kind === 'daily' ? 'daily' : 'weekly';
    const tableId = `${prefix}-report-table`;
    const theadId = `${prefix}-report-thead`;
    const tbodyId = `${prefix}-report-tbody`;
    const html = `
      <div class="ReportTable__container">
        <table class="ReportTable__table" id="${tableId}">
          <thead id="${theadId}">
            <tr>
              <th>Client ID</th>
              <th>Client</th>
            </tr>
          </thead>
          <tbody id="${tbodyId}">
            <tr>
              <td colspan="2" class="ReportTable__emptyState">데이터 로딩 중...</td>
            </tr>
          </tbody>
        </table>
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
