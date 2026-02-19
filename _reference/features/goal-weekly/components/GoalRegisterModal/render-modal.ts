/**
 * Goal 등록 모달 JS-First: render()로 마크업 생성.
 * Phase 5b — index.html L648~L791 대체.
 */

function getGoalRegisterModalHTML(): string {
  return `
<div id="goal-register-modal" class="Modal__overlay">
  <div class="Modal__container">
    <div class="Modal__contentWrapper">
      <div class="Modal__leftSection">
        <div class="Modal__header">
          <h3 class="Modal__title">NEW OBJECTIVE</h3>
          <button class="Modal__closeBtn" id="close-goal-modal-btn">
            <i class="ri-close-line"></i>
          </button>
        </div>
        <form id="goal-register-form" class="Modal__body" autocomplete="off">
          <div class="GoalRegisterForm__group">
            <label class="form-label">담당자 <span class="required-asterisk">*</span></label>
            <div class="GoalRegisterForm__row">
              <div class="form-col half-col">
                <select id="goal-manager-select" class="form-input form-glass-select" required disabled>
                  <option value="">담당자 선택</option>
                </select>
              </div>
              <div class="form-col half-col">
                <div class="date-picker-wrapper" id="date-picker-anchor">
                  <input type="text" id="goal-date-input" class="form-input date-input" readonly
                      placeholder="주차 선택">
                  <i class="ri-calendar-line date-input-icon" id="open-date-picker-btn"></i>
                </div>
              </div>
            </div>
          </div>

          <div class="GoalRegisterForm__group">
            <label class="form-label">Target Client</label>
            <div class="multi-select-container">
              <div class="multi-select-input-wrapper" id="client-select-wrapper">
                <div class="selected-clients-tags" id="selected-clients-tags"></div>
                <input type="text" id="client-search-input" class="client-search-input"
                    placeholder="" autocomplete="off">
                <button type="button" class="multi-select-toggle-btn" id="client-select-toggle">
                  <i class="ri-arrow-down-s-line"></i>
                </button>
              </div>
              <div class="multi-select-dropdown" id="client-select-dropdown">
                <div class="multi-select-header">
                  <span class="multi-select-count" id="client-select-count">0개 선택됨</span>
                  <div class="multi-select-header-actions">
                    <button type="button" class="multi-select-clear-all"
                        id="client-select-clear-all">전체 해제</button>
                    <span class="multi-select-separator">|</span>
                    <button type="button" class="multi-select-done" id="client-select-done">선택 완료</button>
                  </div>
                </div>
                <ul class="multi-select-options" id="client-select-options">
                  <li class="multi-select-option loading">로딩 중...</li>
                </ul>
              </div>
            </div>
            <input type="hidden" id="selected-client-ids" name="selected-client-ids">
          </div>

          <div class="GoalRegisterForm__group">
            <label class="form-label">Target & Revenue <span class="required-asterisk">*</span></label>
            <div class="GoalRegisterForm__row">
              <div class="form-col third-col">
                <input type="hidden" id="goal-category-select" name="goal_category" value="upsales_big">
                <div class="GoalRegisterForm__categoryDropdown" id="goal-category-dropdown" data-value="upsales_big">
                  <button type="button" class="GoalRegisterForm__categoryTrigger">
                    <span class="GoalRegisterForm__categoryDot" data-category="upsales_big"></span>
                    <span class="GoalRegisterForm__categoryValue">업세일 - 고래</span>
                    <i class="ri-arrow-down-s-line GoalRegisterForm__categoryChevron"></i>
                  </button>
                  <div class="GoalRegisterForm__categoryMenu">
                    <div class="GoalRegisterForm__categoryItem active" data-value="upsales_big">
                      <span class="GoalRegisterForm__categoryDot" data-category="upsales_big"></span>
                      업세일 - 고래
                    </div>
                    <div class="GoalRegisterForm__categoryItem" data-value="upsales_smb">
                      <span class="GoalRegisterForm__categoryDot" data-category="upsales_smb"></span>
                      업세일 - SMB
                    </div>
                    <div class="GoalRegisterForm__categoryItem" data-value="new">
                      <span class="GoalRegisterForm__categoryDot" data-category="new"></span>
                      신규
                    </div>
                    <div class="GoalRegisterForm__categoryItem" data-value="outbound">
                      <span class="GoalRegisterForm__categoryDot" data-category="outbound"></span>
                      아웃바운드
                    </div>
                    <div class="GoalRegisterForm__categoryItem" data-value="etc">
                      <span class="GoalRegisterForm__categoryDot" data-category="etc"></span>
                      기타
                    </div>
                  </div>
                </div>
              </div>
              <div class="form-col third-col">
                <input type="text" id="start-revenue-input" class="form-input"
                    placeholder="Ads Revenue" inputmode="numeric" autocomplete="off">
              </div>
              <div class="form-col third-col">
                <input type="text" id="goal-revenue-input" class="form-input" required
                    placeholder="Revenue Goal" inputmode="numeric" autocomplete="off">
              </div>
            </div>
          </div>

          <div class="GoalRegisterForm__group">
            <label class="form-label">Objective <span class="required-asterisk">*</span></label>
            <input type="text" id="goal-memo-input" class="form-input form-single-line"
                placeholder="Set Your Objective" maxlength="200" autocomplete="off" autocapitalize="off"
                autocorrect="off" spellcheck="false">
          </div>

          <div class="GoalRegisterForm__group">
            <label class="form-label">Action Item</label>
            <div id="action-items-container">
              <div class="action-item-row">
                <input type="text" class="form-input action-item-input"
                    placeholder="Add Your Action Item" data-action-index="0" autocomplete="off">
                <button type="button" class="action-item-add-btn" id="add-action-item-btn">
                  <i class="ri-add-line"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-cancel" id="cancel-goal-modal-btn">취소</button>
            <button type="submit" class="btn-submit">등록하기</button>
          </div>
        </form>
      </div>
      <div class="modal-right-section" id="modal-right-section">
        <div class="modal-right-header">
          <h3 class="modal-right-title">선택된 광고주 (0)</h3>
        </div>
        <div class="modal-right-content">
          <p class="empty-selection-message">광고주를 선택해주세요</p>
        </div>
      </div>
    </div>
  </div>
</div>
`;
}

/** Goal 등록 모달 DOM을 container에 주입 (JS-First). */
export function renderGoalRegisterModal(container: HTMLElement): void {
  container.insertAdjacentHTML('beforeend', getGoalRegisterModalHTML());
}
