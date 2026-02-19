/**
 * 사이드바 컴포넌트 (JS-First)
 * _backup/index.html L32~L123 마크업을 render()로 생성.
 * 기존 .nav-item, .page, data-page 구조를 유지해 라우터와 호환.
 */

import './Sidebar.css';

export class Sidebar {
  private root: HTMLElement | null = null;

  render(container: HTMLElement): void {
    const html = `
      <aside class="Sidebar">
        <div class="Sidebar__header">
          <div class="Sidebar__logo">
            <i class="ri-bar-chart-grouped-fill"></i>
            <span>Data Board</span>
          </div>
        </div>
        <nav class="Sidebar__nav">
          <ul class="Sidebar__navMenu">
            <li class="Sidebar__navItem active" data-page="dashboard">
              <a href="#" class="Sidebar__navLink">
                <i class="ri-dashboard-3-line Sidebar__navIcon"></i>
                <span class="Sidebar__navText">Dashboard</span>
              </a>
            </li>
            <li class="Sidebar__navItem" data-page="sales-report">
              <div class="Sidebar__navLinkWrapper">
                <a href="#" class="Sidebar__navLink">
                  <i class="ri-pie-chart-2-line Sidebar__navIcon"></i>
                  <span class="Sidebar__navText">Report</span>
                  <i class="ri-arrow-down-s-line Sidebar__arrowIcon"></i>
                </a>
              </div>
              <ul class="Sidebar__subMenu">
                <li class="Sidebar__subItem active" data-sub-page="daily">
                  <a href="#" class="Sidebar__subLink" data-tab="daily">
                    <span class="Sidebar__dot"></span>Daily Report
                  </a>
                </li>
                <li class="Sidebar__subItem" data-sub-page="weekly">
                  <a href="#" class="Sidebar__subLink" data-tab="weekly">
                    <span class="Sidebar__dot"></span>Weekly Report
                  </a>
                </li>
              </ul>
            </li>
            <li class="Sidebar__navItem" data-page="goal">
              <div class="Sidebar__navLinkWrapper">
                <a href="#" class="Sidebar__navLink">
                  <i class="ri-focus-3-line Sidebar__navIcon"></i>
                  <span class="Sidebar__navText">Goal</span>
                  <i class="ri-arrow-down-s-line Sidebar__arrowIcon"></i>
                </a>
              </div>
              <ul class="Sidebar__subMenu">
                <li class="Sidebar__subItem" data-sub-page="monthly">
                  <a href="#" class="Sidebar__subLink" data-tab="goal-monthly">
                    <span class="Sidebar__dot"></span>Monthly
                  </a>
                </li>
                <li class="Sidebar__subItem" data-sub-page="weekly">
                  <a href="#" class="Sidebar__subLink" data-tab="goal-weekly">
                    <span class="Sidebar__dot"></span>Weekly
                  </a>
                </li>
              </ul>
            </li>
            <li class="Sidebar__navItem" data-page="setting">
              <div class="Sidebar__navLinkWrapper">
                <a href="#" class="Sidebar__navLink">
                  <i class="ri-settings-3-line Sidebar__navIcon"></i>
                  <span class="Sidebar__navText">Setting</span>
                  <i class="ri-arrow-down-s-line Sidebar__arrowIcon"></i>
                </a>
              </div>
              <ul class="Sidebar__subMenu">
                <li class="Sidebar__subItem" data-sub-page="goal-setting">
                  <a href="#" class="Sidebar__subLink" data-tab="goal-setting">
                    <span class="Sidebar__dot"></span>Goal Setting
                  </a>
                </li>
                <li class="Sidebar__subItem" data-sub-page="manager-setting">
                  <a href="#" class="Sidebar__subLink" data-tab="manager-setting">
                    <span class="Sidebar__dot"></span>Manager Setting
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </nav>
        <div class="Sidebar__footer">
          <button class="Sidebar__updateBtn update-btn" type="button">
            <i class="ri-refresh-line"></i> Update Data
          </button>
        </div>
      </aside>
    `;
    container.insertAdjacentHTML('beforeend', html);
    this.root = container.querySelector('.Sidebar');
  }

  destroy(): void {
    this.root?.remove();
    this.root = null;
  }
}
