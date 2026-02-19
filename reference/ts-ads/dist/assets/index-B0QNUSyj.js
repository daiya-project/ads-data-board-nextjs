import{aB as d,aC as i,aD as o,aE as r,aF as g,aG as c,aH as b,aI as p,aJ as v}from"./index-DEwrhD7r.js";const a="setting-page";function e(t){t.innerHTML=`
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
  `}function s(){const t=document.getElementById(a);t&&t.children.length===0&&e(t)}export{d as cancelCellEditDirect,i as enableCellEdit,s as initSettingsPage,o as loadBulkManagerSelect,r as loadManagerSetting,g as saveCellEditDirect,c as saveSelectedManagers,b as setupGoalSettingEvents,p as setupManagerSettingEvents,v as updateTotalAndGap};
