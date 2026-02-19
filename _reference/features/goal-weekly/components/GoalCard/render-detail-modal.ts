/**
 * Goal 상세 모달 JS-First: render()로 마크업 생성.
 * Phase 5b — index.html L794~L814 대체. (Phase 5c: components/goals/render-detail-modal → feature)
 */

function getGoalDetailModalHTML(): string {
  return `
<div id="goal-detail-modal" class="Modal__overlay">
  <div class="Modal__container">
    <div class="Modal__header">
      <h3 class="Modal__title">OBJECTIVE DETAIL</h3>
      <div class="Modal__headerActions">
        <button class="Modal__editBtn" id="edit-goal-detail-btn" title="수정">
          <i class="ri-edit-line"></i>
        </button>
        <button class="Modal__cloneBtn" id="clone-goal-detail-btn" title="다음 주로 복제">
          <i class="ri-file-copy-line"></i>
        </button>
        <button class="Modal__closeBtn" id="close-goal-detail-modal-btn">
          <i class="ri-close-line"></i>
        </button>
      </div>
    </div>
    <div class="Modal__body" id="goal-detail-body">
    </div>
  </div>
</div>
`;
}

/** Goal 상세 모달 DOM을 container에 주입 (JS-First). */
export function renderGoalDetailModal(container: HTMLElement): void {
  container.insertAdjacentHTML('beforeend', getGoalDetailModalHTML());
}
