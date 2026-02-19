/**
 * Goal Setting - Cell Change Handler
 * 개별 셀렉트 박스 변경 핸들러 (담당자/영업 담당자)
 */

import { getSupabaseClientSafe } from '@shared/api';
import { showToast, devLog, backfillManagerForClient } from '@shared/lib';
import type { LoadManagerSettingFn } from '../ManagerSettingTable/manager-setting-types';

async function updateClientManager(
  clientId: number,
  managerId: number | null,
  managerName: string
): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.');

  const { error } = await supabase
    .from('ads_data_client')
    .update({ manager_id: managerId })
    .eq('client_id', clientId);

  if (error) throw new Error(`Manager 업데이트 오류: ${error.message}`);

  // 과거 ads_data_daily 데이터 중 manager_id가 NULL인 행을 백필
  await backfillManagerForClient(supabase, clientId, managerId);

  devLog(`Client ${clientId}의 Manager가 ${managerId}(${managerName})로 업데이트되었습니다.`);
  const displayManagerName = managerName === '-' ? '미지정' : managerName;
  showToast(`✅ Client ID ${clientId}의 담당자가 "${displayManagerName}"(으)로 변경되었습니다.`);
}

export function setupManagerSelectChangeHandlers(
  loadManagerSetting: LoadManagerSettingFn
): void {
  const dropdowns = document.querySelectorAll<HTMLElement>(
    '.cell-glass-dropdown:not(.cell-glass-dropdown--second)'
  );
  if (!dropdowns?.length) return;

  dropdowns.forEach((dropdown) => {
    if (dropdown.hasAttribute('data-change-listener-attached')) return;
    dropdown.setAttribute('data-change-listener-attached', 'true');

    dropdown.addEventListener('dropdown-change', async (e) => {
      const detail = (e as CustomEvent).detail as {
        clientId: number;
        value: string;
        managerName: string;
      };
      const newManagerId = detail.value ? parseInt(detail.value, 10) : null;
      const managerName = detail.managerName || '미지정';

      try {
        await updateClientManager(detail.clientId, newManagerId, managerName);
      } catch (err) {
        console.error('[셀렉트 박스 변경] 오류:', err);
        showToast(`❌ 담당자 변경 실패: ${(err as Error).message}`);
        loadManagerSetting();
      }
    });
  });
}

async function updateClientSecondManager(
  clientId: number,
  managerId: number | null,
  managerName: string
): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.');

  const { error } = await supabase
    .from('ads_data_client')
    .update({ second_manager_id: managerId })
    .eq('client_id', clientId);

  if (error) throw new Error(`영업 담당자 업데이트 오류: ${error.message}`);
  const displayName = managerName === '-' ? '미지정' : managerName;
  showToast(`✅ Client ID ${clientId}의 영업 담당자가 "${displayName}"(으)로 변경되었습니다.`);
}

export function setupSecondManagerSelectChangeHandlers(
  loadManagerSetting: LoadManagerSettingFn
): void {
  const dropdowns = document.querySelectorAll<HTMLElement>('.cell-glass-dropdown--second');
  if (!dropdowns?.length) return;

  dropdowns.forEach((dropdown) => {
    if (dropdown.hasAttribute('data-change-listener-attached')) return;
    dropdown.setAttribute('data-change-listener-attached', 'true');

    dropdown.addEventListener('dropdown-change', async (e) => {
      const detail = (e as CustomEvent).detail as {
        clientId: number;
        value: string;
        managerName: string;
      };
      const newManagerId = detail.value ? parseInt(detail.value, 10) : null;
      const managerName = detail.managerName || '미지정';

      try {
        await updateClientSecondManager(detail.clientId, newManagerId, managerName);
      } catch (err) {
        console.error('[영업 담당자 변경] 오류:', err);
        showToast(`❌ 영업 담당자 변경 실패: ${(err as Error).message}`);
        loadManagerSetting();
      }
    });
  });
}
