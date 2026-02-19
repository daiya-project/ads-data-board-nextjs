/**
 * Goal Register Helpers - Client Loader Module
 * 클라이언트 데이터 로드 및 처리
 */

import { getCachedElementById, formatDate } from '@shared/lib';
import { getSupabaseClientSafe } from '@shared/api';
import { getClientList } from '@shared/api';
import type { ClientRow } from '@shared/types';

export interface ClientWithRevenue extends ClientRow {
  lastWeekRevenue?: number;
}

export async function loadGoalManagerOptions(): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return;

  const select = document.getElementById('goal-manager-select') as HTMLSelectElement | null;
  if (!select) return;

  try {
    const { data: managers, error } = await supabase
      .from('shared_manager')
      .select('id, manager_name')
      .eq('manager_team', 'ads')
      .not('id', 'in', '(98,99)')
      .order('id', { ascending: true });

    if (error) {
      console.error('담당자 목록 조회 오류:', error);
      return;
    }

    select.innerHTML = '<option value="">담당자 선택</option>';

    if (managers?.length) {
      for (const manager of managers as { id: number; manager_name: string }[]) {
        const option = document.createElement('option');
        option.value = String(manager.id);
        option.textContent = manager.manager_name ?? `Manager ${manager.id}`;
        select.appendChild(option);
      }
    }
  } catch (err) {
    console.error('담당자 옵션 로드 오류:', err);
  }
}

export async function loadClientList(
  managerId: number,
  availableClients: ClientWithRevenue[],
  renderClientOptions: (clients: ClientWithRevenue[], searchTerm?: string) => void
): Promise<void> {
  const optionsContainer = getCachedElementById('client-select-options') as HTMLElement | null;
  if (!optionsContainer) {
    console.error('[loadClientList] optionsContainer를 찾을 수 없습니다');
    return;
  }

  const clients = await getClientList(managerId);
  if (!clients) {
    optionsContainer.innerHTML =
      '<li class="multi-select-option empty">광고주 목록을 불러올 수 없습니다.</li>';
    return;
  }

  const clientsWithRevenue = await getClientsWithLastWeekRevenue(clients);
  clientsWithRevenue.sort((a, b) => (b.lastWeekRevenue ?? 0) - (a.lastWeekRevenue ?? 0));

  availableClients.length = 0;
  availableClients.push(...clientsWithRevenue);

  if (availableClients.length === 0) {
    optionsContainer.innerHTML =
      '<li class="multi-select-option empty">담당하는 광고주가 없습니다.</li>';
    renderClientOptions(availableClients);
    return;
  }

  renderClientOptions(availableClients);
}

export async function getClientsWithLastWeekRevenue(
  clients: ClientRow[]
): Promise<ClientWithRevenue[]> {
  if (!clients?.length) {
    return clients.map((c) => ({ ...c, lastWeekRevenue: 0 }));
  }
  const supabase = getSupabaseClientSafe();
  if (!supabase) {
    return clients.map((c) => ({ ...c, lastWeekRevenue: 0 }));
  }

  const today = new Date();
  const lastWeekMonday = new Date(today);
  lastWeekMonday.setDate(today.getDate() - today.getDay() - 6);
  const lastWeekSunday = new Date(lastWeekMonday);
  lastWeekSunday.setDate(lastWeekMonday.getDate() + 6);

  const lastWeekMondayStr = formatDate(lastWeekMonday);
  const lastWeekSundayStr = formatDate(lastWeekSunday);
  const clientIds = clients.map((c) => c.client_id);

  try {
    const { data: dailyData, error } = await supabase
      .from('ads_data_daily')
      .select('client_id, amount')
      .in('client_id', clientIds)
      .gte('date', lastWeekMondayStr)
      .lte('date', lastWeekSundayStr);

    if (error) {
      console.error('지난 주 매출 조회 오류:', error);
      return clients.map((c) => ({ ...c, lastWeekRevenue: 0 }));
    }

    const revenueMap = new Map<string, number>();
    for (const record of (dailyData ?? []) as { client_id: number; amount: number }[]) {
      const clientId = String(record.client_id);
      revenueMap.set(clientId, (revenueMap.get(clientId) ?? 0) + (record.amount ?? 0));
    }

    return clients.map((client) => ({
      ...client,
      lastWeekRevenue: revenueMap.get(String(client.client_id)) ?? 0,
    }));
  } catch (err) {
    console.error('지난 주 매출 조회 오류:', err);
    return clients.map((c) => ({ ...c, lastWeekRevenue: 0 }));
  }
}

export async function toggleClientSelection(
  clientId: string | number,
  selectedClientIds: Set<string>,
  calculateStartRevenue: () => Promise<void>,
  renderSelectedClients: () => void,
  renderSelectedClientsInRightPanel: (() => void) | undefined,
  renderClientOptions: ((clients: ClientWithRevenue[], searchTerm?: string) => void) | undefined,
  availableClients: ClientWithRevenue[] | undefined
): Promise<void> {
  const clientIdStr = String(clientId);
  if (selectedClientIds.has(clientIdStr)) {
    selectedClientIds.delete(clientIdStr);
  } else {
    selectedClientIds.add(clientIdStr);
  }

  await calculateStartRevenue();
  renderSelectedClients();
  if (renderSelectedClientsInRightPanel) renderSelectedClientsInRightPanel();
  if (renderClientOptions && availableClients) {
    const searchInput = document.getElementById('client-search-input') as HTMLInputElement | null;
    const searchTerm = searchInput?.value ?? '';
    renderClientOptions(availableClients, searchTerm);
  }
}
