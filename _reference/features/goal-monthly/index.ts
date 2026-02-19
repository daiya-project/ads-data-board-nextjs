/**
 * Goal Monthly Feature — JS-First 진입점
 * #goal-monthly-tab이 비어 있으면 헤더+콘텐츠 영역을 렌더한 뒤 초기화 실행
 */

import './goal-monthly.css';
import './components/Calendar/Calendar.css';
import './components/OutboundSection/Outbound.css';
import './components/MaChart/ma-chart-revenue.css';
import './components/RevenueTrend/RevenueTrend.css';
import { initGoalMonthly as initFromLocal, destroyGoalMonthly } from './init';
import { state } from './lib/state';
import { updateMonthDisplay } from './components/MonthSelector';
import { setActiveManagerTab } from './components/ManagerTabs';

const TAB_CONTAINER_ID = 'goal-monthly-tab';
const CONTENT_ID = 'goal-monthly-content';

function renderTabMarkup(container: HTMLElement): void {
  container.innerHTML = `
    <div class="GoalMonthly__header goal-monthly-header">
      <div class="manager-tabs-container goal-monthly-header-tabs" id="goal-monthly-manager-tabs">
        <!-- 매니저 탭 동적 생성 -->
      </div>
      <div class="GoalMonthly__monthPill">
        <button type="button" class="GoalMonthly__monthPillBtn" id="goal-month-prev" aria-label="이전 달">
          <i class="ri-arrow-left-s-line"></i>
        </button>
        <span class="GoalMonthly__monthPillDisplay" id="goal-month-display">2025년 2월</span>
        <button type="button" class="GoalMonthly__monthPillBtn" id="goal-month-next" aria-label="다음 달">
          <i class="ri-arrow-right-s-line"></i>
        </button>
      </div>
    </div>
    <div class="GoalMonthly__content" id="${CONTENT_ID}"></div>
  `;
}

export async function initGoalMonthly(): Promise<void> {
  const container = document.getElementById(TAB_CONTAINER_ID);
  if (!container) return;

  if (container.children.length === 0) {
    renderTabMarkup(container);
  }

  await initFromLocal();
}

export { state, updateMonthDisplay, setActiveManagerTab, destroyGoalMonthly as destroy };
