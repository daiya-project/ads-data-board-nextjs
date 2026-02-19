/**
 * Goal Weekly Feature — 주간 레이아웃 렌더러
 */

import {
  getLayoutConfig,
  getNavigationButtons,
  type WeekConfig,
  type LayoutConfigResult,
} from '../components/WeekNavigation/navigation-state';
import { getWeekLabel, getWeekDateRange } from './week-utils';

function createLayoutContainer(layout: string): HTMLElement {
  const container = document.createElement('div');
  container.className = `WeekNavigation__layout ${layout}`;
  return container;
}

function createWeekSlot(weekConfig: WeekConfig, currentOffset: number, showCloneBtn: boolean): HTMLElement {
  const slot = document.createElement('div');
  slot.className = `WeekNavigation__cardSlot WeekNavigation__cardSlot--${weekConfig.width.replace('%', 'pct')}`;
  slot.setAttribute('data-week-offset', String(weekConfig.offset));

  const header = document.createElement('div');
  header.className = weekConfig.isCurrentWeek ? 'WeekHeader__root current-week' : 'WeekHeader__root';
  header.setAttribute('data-week-offset', String(weekConfig.offset));

  const navInfo = getNavigationButtons(currentOffset);
  const config = getLayoutConfig(currentOffset);
  const weeks = config.weeks;

  const isFirstSlot = weekConfig.offset === weeks[0].offset;
  if (isFirstSlot && navInfo.showLeft) {
    const leftArrow = document.createElement('span');
    leftArrow.className = 'WeekHeader__navArrow';
    leftArrow.textContent = '◀';
    leftArrow.setAttribute('data-direction', 'left');
    header.appendChild(leftArrow);
  } else {
    const spacer = document.createElement('span');
    spacer.className = 'WeekHeader__navArrow WeekHeader__navArrow--hidden';
    spacer.textContent = '◀';
    header.appendChild(spacer);
  }

  const labelSpan = document.createElement('span');
  labelSpan.className = 'WeekHeader__text';
  labelSpan.textContent = getWeekLabel(weekConfig.offset);
  header.appendChild(labelSpan);

  if (showCloneBtn) {
    const cloneBtn = document.createElement('span');
    cloneBtn.className = 'WeekHeader__cloneBtn';
    cloneBtn.innerHTML = '<i class="ri-file-copy-line"></i>';
    cloneBtn.setAttribute('data-week-offset', String(weekConfig.offset));
    cloneBtn.title = '이 주차 목표 복제';
    header.appendChild(cloneBtn);
  }

  const isLastSlot = weekConfig.offset === weeks[weeks.length - 1].offset;
  if (isLastSlot && navInfo.showRight) {
    const rightArrow = document.createElement('span');
    rightArrow.className = 'WeekHeader__navArrow';
    rightArrow.textContent = '▶';
    rightArrow.setAttribute('data-direction', 'right');
    header.appendChild(rightArrow);
  } else {
    const spacer = document.createElement('span');
    spacer.className = 'WeekHeader__navArrow WeekHeader__navArrow--hidden';
    spacer.textContent = '▶';
    header.appendChild(spacer);
  }

  slot.appendChild(header);

  const cardContainer = document.createElement('div');
  cardContainer.className = 'WeekNavigation__cardContainer';
  cardContainer.setAttribute('data-week-offset', String(weekConfig.offset));
  slot.appendChild(cardContainer);

  return slot;
}

export function createEmptyCardPlaceholder(weekOffset: number): HTMLElement {
  const placeholder = document.createElement('div');
  placeholder.className = 'EmptyWeekCard__root';
  const dateRange = getWeekDateRange(weekOffset);
  placeholder.innerHTML = `
    <i class="ri-calendar-line" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
    <p style="font-size: 16px; margin-bottom: 8px;">등록된 목표가 없습니다</p>
    <p style="font-size: 14px; opacity: 0.7;">${dateRange}</p>
  `;
  return placeholder;
}

export function renderLayout(container: HTMLElement | null, offset: number, showCloneBtn = false): void {
  if (!container) return;
  container.innerHTML = '';
  const config = getLayoutConfig(offset);
  const layoutContainer = createLayoutContainer(config.layout);
  config.weeks.forEach((weekConfig) => {
    const slot = createWeekSlot(weekConfig, offset, showCloneBtn);
    layoutContainer.appendChild(slot);
  });
  container.appendChild(layoutContainer);
}

export function updateWeekLabels(container: HTMLElement | null, offset: number): void {
  if (!container) return;
  const config = getLayoutConfig(offset);
  const weeks = config.weeks;
  config.weeks.forEach((weekConfig, index) => {
    const slot = container.querySelector(
      `.WeekNavigation__cardSlot[data-week-offset="${weekConfig.offset}"]`
    );
    if (!slot) return;
    const header = slot.querySelector('.WeekHeader__root');
    if (!header) return;
    const existingArrows = header.querySelectorAll('.WeekHeader__navArrow');
    existingArrows.forEach((arrow) => arrow.remove());
    const navInfo = getNavigationButtons(offset);
    if (index === 0 && navInfo.showLeft) {
      const leftArrow = document.createElement('span');
      leftArrow.className = 'WeekHeader__navArrow';
      leftArrow.textContent = '◀';
      leftArrow.setAttribute('data-direction', 'left');
      const labelSpan = header.querySelector('.WeekHeader__text');
      header.insertBefore(leftArrow, labelSpan);
    }
    if (index === weeks.length - 1 && navInfo.showRight) {
      const rightArrow = document.createElement('span');
      rightArrow.className = 'WeekHeader__navArrow';
      rightArrow.textContent = '▶';
      rightArrow.setAttribute('data-direction', 'right');
      header.appendChild(rightArrow);
    }
  });
}
