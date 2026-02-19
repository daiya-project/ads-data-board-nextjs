/**
 * Goal Setting - Bulk Select Module
 * 일괄 선택 및 저장 기능 (커스텀 글래스 드롭다운 포탈 패턴)
 */

import { getCachedElementById } from '@shared/lib';
import { getSupabaseClientSafe } from '@shared/api';
import { showToast, backfillManagerForClients } from '@shared/lib';

import type { LoadManagerSettingFn } from './manager-setting-types';

/** 매니저 옵션 목록 (id → name) 캐시 */
let bulkManagerOptions: { id: number; name: string }[] = [];

/** 열려있는 bulk 포탈 메뉴 닫기 */
function closeBulkPortalMenu(): void {
  const wrapper = document.getElementById('bulk-manager-dropdown');
  wrapper?.classList.remove('open');
  document.querySelectorAll('.bulk-glass-dropdown__menu--portal').forEach((el) => {
    el.classList.remove('cell-glass-dropdown__menu--visible');
    setTimeout(() => el.remove(), 200);
  });
}

export async function loadBulkManagerSelect(): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return;

  const wrapper = document.getElementById('bulk-manager-dropdown');
  if (!wrapper) return;

  try {
    const { data: managerData, error } = await supabase
      .from('shared_manager')
      .select('id, manager_name')
      .eq('manager_team', 'ads')
      .in('id', [1, 2, 3, 4, 5, 98])
      .order('id', { ascending: true });

    if (error) {
      console.error('Manager 데이터 조회 오류:', error);
      return;
    }

    // 옵션 캐시 갱신
    bulkManagerOptions = [];
    if (managerData?.length) {
      for (const manager of managerData as { id: number; manager_name: string }[]) {
        bulkManagerOptions.push({
          id: manager.id,
          name: manager.manager_name ?? `Manager ${manager.id}`,
        });
      }
    } else {
      for (const i of [1, 2, 3, 4, 5, 98]) {
        bulkManagerOptions.push({ id: i, name: `Manager ${i}` });
      }
    }

    // 선택 상태 초기화
    wrapper.dataset.selectedValue = '';
    const valueEl = wrapper.querySelector('.cell-glass-dropdown__value');
    if (valueEl) valueEl.textContent = '담당자 선택';

    // 트리거 이벤트 (중복 방지)
    const trigger = wrapper.querySelector('.cell-glass-dropdown__trigger') as HTMLElement | null;
    if (trigger && !trigger.hasAttribute('data-bulk-listener')) {
      trigger.setAttribute('data-bulk-listener', 'true');

      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isOpen = wrapper.classList.contains('open');

        // 테이블 셀 드롭다운 + 기존 bulk 메뉴 닫기
        document.querySelectorAll('.cell-glass-dropdown.open').forEach((el) => el.classList.remove('open'));
        document.querySelectorAll('.cell-glass-dropdown__menu--portal, .bulk-glass-dropdown__menu--portal').forEach((el) => {
          el.classList.remove('cell-glass-dropdown__menu--visible');
          setTimeout(() => el.remove(), 200);
        });

        if (isOpen) return;

        // 포탈 메뉴 생성
        const menu = buildBulkMenu(wrapper, valueEl as HTMLElement);
        document.body.appendChild(menu);

        // 위치 계산
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

      // 전역 클릭으로 닫기
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('#bulk-manager-dropdown') || target.closest('.bulk-glass-dropdown__menu--portal')) {
          return;
        }
        closeBulkPortalMenu();
      });
    }
  } catch (err) {
    console.error('일괄 담당자 드랍박스 로드 오류:', err);
  }
}

function buildBulkMenu(wrapper: HTMLElement, valueEl: HTMLElement): HTMLDivElement {
  const menu = document.createElement('div');
  menu.className = 'cell-glass-dropdown__menu--portal bulk-glass-dropdown__menu--portal';

  const currentVal = wrapper.dataset.selectedValue ?? '';

  // 기본 옵션 (미선택)
  const emptyItem = document.createElement('div');
  emptyItem.className = `glass-dropdown-item${!currentVal ? ' active' : ''}`;
  emptyItem.dataset.value = '';
  emptyItem.textContent = '담당자 선택';
  menu.appendChild(emptyItem);

  // 매니저 옵션
  for (const opt of bulkManagerOptions) {
    const item = document.createElement('div');
    item.className = `glass-dropdown-item${currentVal === String(opt.id) ? ' active' : ''}`;
    item.dataset.value = String(opt.id);
    item.textContent = opt.name;
    menu.appendChild(item);
  }

  // 클릭 핸들러
  menu.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('.glass-dropdown-item') as HTMLElement;
    if (!target) return;
    e.stopPropagation();

    const newValue = target.dataset.value ?? '';
    wrapper.dataset.selectedValue = newValue;
    valueEl.textContent = target.textContent ?? '담당자 선택';
    wrapper.classList.remove('open');

    menu.classList.remove('cell-glass-dropdown__menu--visible');
    setTimeout(() => menu.remove(), 200);
  });

  return menu;
}

export async function saveSelectedManagers(
  loadManagerSetting: LoadManagerSettingFn
): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) {
    showToast('❌ 데이터베이스 연결 오류');
    return;
  }

  const wrapper = document.getElementById('bulk-manager-dropdown');
  const selectedValue = wrapper?.dataset.selectedValue ?? '';

  if (!selectedValue) {
    showToast('⚠️ 담당자를 선택해주세요');
    return;
  }

  const selectedManagerId = parseInt(selectedValue, 10);
  if (Number.isNaN(selectedManagerId)) {
    showToast('⚠️ 올바른 담당자를 선택해주세요');
    return;
  }

  const managerName = bulkManagerOptions.find((o) => o.id === selectedManagerId)?.name ?? '담당자';

  const checkedBoxes = document.querySelectorAll<HTMLInputElement>(
    '#manager-setting-table .client-checkbox:checked'
  );
  if (!checkedBoxes.length) {
    showToast('⚠️ 담당자를 지정할 클라이언트를 선택해주세요');
    return;
  }

  const clientIds = Array.from(checkedBoxes).map((cb) =>
    parseInt((cb as HTMLInputElement & { dataset: { clientId?: string } }).dataset.clientId ?? '', 10)
  );
  if (clientIds.length === 0) {
    showToast('⚠️ 선택된 클라이언트가 없습니다');
    return;
  }

  if (!confirm(`${clientIds.length}개의 클라이언트에 담당자 "${managerName}"를 지정하시겠습니까?`)) {
    return;
  }

  const saveBtn = getCachedElementById('save-managers-btn');
  const originalText = saveBtn?.textContent ?? '확인';
  if (saveBtn) {
    saveBtn.setAttribute('disabled', 'true');
    saveBtn.textContent = '저장 중...';
  }

  try {
    const { error } = await supabase
      .from('ads_data_client')
      .update({ manager_id: selectedManagerId })
      .in('client_id', clientIds);

    if (error) throw new Error(`담당자 업데이트 오류: ${error.message}`);

    // 과거 ads_data_daily 데이터 중 manager_id가 NULL인 행을 일괄 백필
    await backfillManagerForClients(supabase, clientIds, selectedManagerId);

    showToast(`✅ ${clientIds.length}개 클라이언트의 담당자가 "${managerName}"(으)로 변경되었습니다`);
    checkedBoxes.forEach((cb) => ((cb as HTMLInputElement).checked = false));

    // 선택 상태 초기화
    if (wrapper) {
      wrapper.dataset.selectedValue = '';
      const valueEl = wrapper.querySelector('.cell-glass-dropdown__value');
      if (valueEl) valueEl.textContent = '담당자 선택';
    }

    await loadManagerSetting();
  } catch (err) {
    console.error('[saveSelectedManagers] 담당자 저장 오류:', err);
    showToast(`❌ 담당자 저장 실패: ${(err as Error).message}`);
  } finally {
    if (saveBtn) {
      saveBtn.removeAttribute('disabled');
      saveBtn.textContent = originalText;
    }
  }
}
