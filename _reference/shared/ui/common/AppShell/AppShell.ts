/**
 * 앱 셸: 레이아웃 (사이드바 + 메인 영역).
 * index.html의 .dashboard-container + sidebar + main 구조를 JS-First로 렌더링.
 */

import { Sidebar } from '../Sidebar';
import './AppShell.css';

export class AppShell {
  private root: HTMLElement | null = null;
  private sidebar: Sidebar | null = null;

  render(container: HTMLElement): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'dashboard-container';

    const sidebarMount = document.createElement('div');
    sidebarMount.className = 'sidebar-mount';
    wrapper.appendChild(sidebarMount);

    const mainHtml = `
      <main class="main-content" id="main-content">
        <div class="page active" id="dashboard-page"></div>
        <div class="page" id="sales-report-page"></div>
        <div class="page" id="goal-page">
          <div class="tab-content" id="goal-monthly-tab"></div>
          <div class="tab-content active" id="goal-weekly-tab">
            <div class="goal-weekly-header">
              <div class="manager-tabs-container goal-weekly-header-tabs">
                <div class="manager-tabs" id="manager-tabs"></div>
              </div>
              <button class="register-btn" id="open-goal-modal-btn" type="button">
                <i class="ri-add-line"></i> 등록
              </button>
            </div>
            <div class="report-section" id="manager-content-area">
              <p class="empty-state">담당자를 선택해주세요.</p>
            </div>
          </div>
        </div>
        <div class="page" id="setting-page"></div>
      </main>
    `;
    wrapper.insertAdjacentHTML('beforeend', mainHtml);

    this.sidebar = new Sidebar();
    this.sidebar.render(sidebarMount);

    container.appendChild(wrapper);
    this.root = wrapper;
  }

  destroy(): void {
    this.sidebar?.destroy();
    this.sidebar = null;
    this.root?.remove();
    this.root = null;
  }
}
