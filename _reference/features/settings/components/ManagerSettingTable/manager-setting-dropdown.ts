/**
 * Manager Setting Table - 셀용 글래스 드롭다운
 * 트리거는 기존 .manager-select-cell 디자인 유지
 * 메뉴는 document.body에 포탈로 생성
 */

/** 현재 열려있는 모든 포탈 메뉴 (셀 + bulk)를 닫고 body에서 제거 */
export function closeAllCellDropdowns(): void {
  document.querySelectorAll('.cell-glass-dropdown.open').forEach((el) => {
    el.classList.remove('open');
  });
  document.querySelectorAll('.cell-glass-dropdown__menu--portal, .bulk-glass-dropdown__menu--portal').forEach((el) => {
    el.classList.remove('cell-glass-dropdown__menu--visible');
    setTimeout(() => el.remove(), 200);
  });
}

/**
 * 테이블 셀용 커스텀 글래스 드롭다운 생성
 */
export function createCellGlassDropdown(
  clientId: number,
  managerMap: Map<number, string>,
  selectedManagerId: number | null,
  managerIds: number[],
  extraClass?: string
): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.className = `cell-glass-dropdown${extraClass ? ` ${extraClass}` : ''}`;
  wrapper.dataset.clientId = String(clientId);

  const selectedName = selectedManagerId != null
    ? (managerMap.get(selectedManagerId) ?? '-')
    : '-';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'cell-glass-dropdown__trigger';

  const valueSpan = document.createElement('span');
  valueSpan.className = 'cell-glass-dropdown__value';
  valueSpan.textContent = selectedName;
  trigger.appendChild(valueSpan);

  const chevron = document.createElement('span');
  chevron.className = 'cell-glass-dropdown__chevron';
  chevron.innerHTML = '&#9662;';
  trigger.appendChild(chevron);

  wrapper.appendChild(trigger);

  function buildMenu(): HTMLDivElement {
    const menu = document.createElement('div');
    menu.className = 'cell-glass-dropdown__menu cell-glass-dropdown__menu--portal';

    const emptyItem = document.createElement('div');
    emptyItem.className = `glass-dropdown-item${selectedManagerId == null ? ' active' : ''}`;
    emptyItem.dataset.value = '';
    emptyItem.textContent = '-';
    menu.appendChild(emptyItem);

    managerIds.forEach((managerId) => {
      const item = document.createElement('div');
      const currentValue = wrapper.dataset.selectedValue ?? '';
      const isActive = currentValue
        ? currentValue === String(managerId)
        : selectedManagerId === managerId;
      item.className = `glass-dropdown-item${isActive ? ' active' : ''}`;
      item.dataset.value = String(managerId);
      item.textContent = managerMap.get(managerId) ?? '';
      menu.appendChild(item);
    });

    const currentVal = wrapper.dataset.selectedValue ?? '';
    if (!currentVal) {
      menu.querySelector('.glass-dropdown-item')?.classList.add('active');
    }

    menu.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('.glass-dropdown-item') as HTMLElement;
      if (!target) return;
      e.stopPropagation();

      const newValue = target.dataset.value ?? '';
      valueSpan.textContent = target.textContent ?? '-';
      wrapper.dataset.selectedValue = newValue;
      wrapper.classList.remove('open');

      menu.classList.remove('cell-glass-dropdown__menu--visible');
      setTimeout(() => menu.remove(), 200);

      wrapper.dispatchEvent(new CustomEvent('dropdown-change', {
        detail: {
          clientId,
          value: newValue,
          managerName: target.textContent ?? '-'
        }
      }));
    });

    return menu;
  }

  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const isCurrentlyOpen = wrapper.classList.contains('open');

    closeAllCellDropdowns();

    if (isCurrentlyOpen) return;

    const menu = buildMenu();
    document.body.appendChild(menu);

    const rect = trigger.getBoundingClientRect();
    const gap = 4;

    menu.style.minWidth = `${rect.width}px`;
    menu.style.left = `${rect.left}px`;

    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;

    if (spaceBelow >= 200 || spaceBelow >= spaceAbove) {
      menu.style.top = `${rect.bottom + gap}px`;
      menu.style.bottom = '';
    } else {
      menu.style.top = '';
      menu.style.bottom = `${window.innerHeight - rect.top + gap}px`;
    }

    wrapper.classList.add('open');

    requestAnimationFrame(() => {
      menu.classList.add('cell-glass-dropdown__menu--visible');
    });
  });

  wrapper.dataset.selectedValue = selectedManagerId != null ? String(selectedManagerId) : '';

  return wrapper;
}
