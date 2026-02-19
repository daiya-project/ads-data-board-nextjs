/**
 * Settings Feature — JS-First 진입점 (Phase 6)
 * #setting-page가 비어 있으면 Goal Setting / Manager Setting 탭 마크업 주입.
 * Goal Setting·Manager Setting 로직은 features/settings/components·lib에서 제공.
 */

// Goal Setting — 셀 편집
export {
  enableCellEdit,
  saveCellEditDirect,
  cancelCellEditDirect,
  updateTotalAndGap,
} from './components/GoalSettingTable';
// Manager Setting — 매니저 테이블·일괄 선택
export {
  loadManagerSetting,
  loadBulkManagerSelect,
  saveSelectedManagers,
} from './components/ManagerSettingTable';
// 이벤트 설정
export { setupGoalSettingEvents, setupManagerSettingEvents } from './lib/events';

const SETTING_PAGE_ID = 'setting-page';

function renderSettingPageMarkup(container: HTMLElement): void {
  container.innerHTML = `
    <div class="tab-content" id="goal-setting-tab">
      <div class="report-section">
        <div class="report-table-container">
          <table class="report-table" id="goal-setting-table">
            <thead id="goal-setting-thead">
              <tr>
                <th>월</th>
              </tr>
            </thead>
            <tbody id="goal-setting-tbody">
              <tr>
                <td colspan="1" class="empty-state">데이터 로딩 중...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="tab-content active" id="manager-setting-tab">
      <div class="report-section">
        <div class="manager-setting-header">
          <button type="button" class="btn-filter-unassigned" id="show-unassigned-btn">담당자 미지정 보기</button>
          <div class="manager-setting-actions">
            <div class="cell-glass-dropdown cell-glass-dropdown--bulk" id="bulk-manager-dropdown" data-selected-value="">
              <button type="button" class="cell-glass-dropdown__trigger cell-glass-dropdown__trigger--bulk">
                <span class="cell-glass-dropdown__value">담당자 선택</span>
                <span class="cell-glass-dropdown__chevron">&#9662;</span>
              </button>
            </div>
            <button type="button" class="btn-save-managers" id="save-managers-btn">저장</button>
          </div>
        </div>
        <div class="report-table-container">
          <table class="report-table" id="manager-setting-table">
            <thead id="manager-setting-thead">
              <tr>
                <th></th>
                <th>DATE</th>
                <th>Client ID</th>
                <th>Client</th>
                <th>담당자</th>
                <th>영업 담당자</th>
                <th>OUT-BOUND</th>
              </tr>
            </thead>
            <tbody id="manager-setting-tbody">
              <tr>
                <td colspan="7" class="empty-state">데이터 로딩 중...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

/**
 * Setting 페이지 DOM 초기화.
 * 컨테이너가 비어 있으면 JS-First로 Goal Setting / Manager Setting 탭 마크업을 그린다.
 */
export function initSettingsPage(): void {
  const container = document.getElementById(SETTING_PAGE_ID);
  if (!container) return;

  if (container.children.length === 0) {
    renderSettingPageMarkup(container);
  }
}
