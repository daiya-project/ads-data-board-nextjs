/**
 * Manager Setting Table - 테이블 행 렌더링
 */

import { cleanClientName } from '@shared/lib';
import type { ManagerSettingClient } from './manager-setting-types';
import { formatCreatedAt } from './manager-setting-format';
import { createCellGlassDropdown } from './manager-setting-dropdown';
import type { OutboundRecord } from './OutboundModal';

export function renderManagerSettingRows(
  tbody: HTMLElement,
  sortedData: ManagerSettingClient[],
  managerMap: Map<number, string>,
  outboundMap?: Map<number, OutboundRecord>
): void {
  tbody.innerHTML = '';

  const sortedManagerIds = Array.from(managerMap.keys()).sort((a, b) => a - b);
  const secondManagerIds = sortedManagerIds.filter((id) => id !== 98);

  sortedData.forEach((client) => {
    const row = document.createElement('tr');

    const tdCheckbox = document.createElement('td');
    tdCheckbox.style.textAlign = 'center';
    tdCheckbox.style.width = '50px';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'client-checkbox';
    checkbox.dataset.clientId = String(client.client_id);
    tdCheckbox.appendChild(checkbox);
    row.appendChild(tdCheckbox);

    const tdDate = document.createElement('td');
    tdDate.textContent = formatCreatedAt(client.created_at);
    tdDate.style.textAlign = 'center';
    tdDate.style.fontFamily = "'Roboto Mono', monospace";
    tdDate.className = 'manager-setting-date-cell';
    row.appendChild(tdDate);

    const tdId = document.createElement('td');
    tdId.textContent = String(client.client_id);
    tdId.style.textAlign = 'center';
    tdId.style.fontFamily = "'Roboto Mono', monospace";
    row.appendChild(tdId);

    const tdName = document.createElement('td');
    tdName.textContent = cleanClientName(client.client_name ?? '');
    tdName.style.textAlign = 'center';
    row.appendChild(tdName);

    const tdManager = document.createElement('td');
    tdManager.style.textAlign = 'center';
    const managerDropdown = createCellGlassDropdown(
      client.client_id,
      managerMap,
      client.manager_id,
      sortedManagerIds
    );
    tdManager.appendChild(managerDropdown);
    row.appendChild(tdManager);

    const tdSecondManager = document.createElement('td');
    tdSecondManager.style.textAlign = 'center';
    const secondManagerDropdown = createCellGlassDropdown(
      client.client_id,
      managerMap,
      client.second_manager_id ?? null,
      secondManagerIds,
      'cell-glass-dropdown--second'
    );
    tdSecondManager.appendChild(secondManagerDropdown);
    row.appendChild(tdSecondManager);

    const tdOutbound = document.createElement('td');
    tdOutbound.style.textAlign = 'center';
    const outboundBtn = document.createElement('button');
    outboundBtn.type = 'button';
    const isActive = outboundMap?.has(Number(client.client_id)) ?? false;
    outboundBtn.className = `outbound-setting-btn${isActive ? ' outbound-setting-btn--active' : ''}`;
    outboundBtn.dataset.clientId = String(client.client_id);
    outboundBtn.dataset.clientName = cleanClientName(client.client_name ?? '');
    outboundBtn.textContent = isActive ? '활성' : '설정';
    tdOutbound.appendChild(outboundBtn);
    row.appendChild(tdOutbound);

    tbody.appendChild(row);
  });
}
