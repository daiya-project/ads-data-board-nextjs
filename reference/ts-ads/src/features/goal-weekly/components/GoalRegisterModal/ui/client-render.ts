/**
 * Goal Register Helpers - Client Render Module
 * 클라이언트 UI 렌더링
 */

import { devLog } from '@shared/lib';
import type { ClientWithRevenue } from '../services/client-loader';

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function attachClickEvents(
  optionsContainer: Element,
  toggleClientSelection: (clientId: string) => void
): void {
  optionsContainer.querySelectorAll('.multi-select-option:not(.empty)').forEach((option) => {
    option.addEventListener('click', function (this: HTMLElement, e: Event) {
      e.stopPropagation();
      const clientId = this.dataset.clientId;
      if (clientId) toggleClientSelection(clientId);
    });
  });
}

function renderAllClients(
  clients: ClientWithRevenue[],
  selectedClientIds: Set<string>,
  toggleClientSelection: (clientId: string) => void,
  optionsContainer: HTMLElement
): void {
  optionsContainer.innerHTML = clients
    .map((client) => {
      const clientIdStr = String(client.client_id);
      const isSelected =
        selectedClientIds.has(clientIdStr) || selectedClientIds.has(String(client.client_id));
      return `
        <li class="multi-select-option ${isSelected ? 'selected' : ''}" data-client-id="${client.client_id}">
          <div class="multi-select-checkbox">
            <i class="ri-check-line multi-select-checkbox-icon"></i>
          </div>
          <div class="multi-select-option-label">
            <span class="multi-select-option-client-id">${client.client_id}.</span>
            <span class="multi-select-option-client-name">${client.client_name ?? ''}</span>
          </div>
        </li>
      `;
    })
    .join('');
  attachClickEvents(optionsContainer, toggleClientSelection);
}

function renderFilteredClients(
  clients: ClientWithRevenue[],
  selectedClientIds: Set<string>,
  toggleClientSelection: (clientId: string) => void,
  optionsContainer: HTMLElement,
  searchTerms: string[]
): void {
  optionsContainer.innerHTML = clients
    .map((client) => {
      const clientIdStr = String(client.client_id);
      const isSelected =
        selectedClientIds.has(clientIdStr) || selectedClientIds.has(String(client.client_id));
      let highlightedId = clientIdStr;
      let highlightedName = client.client_name ?? '';
      for (const term of searchTerms) {
        const termLower = term.toLowerCase();
        const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
        if (clientIdStr.toLowerCase().includes(termLower)) {
          highlightedId = clientIdStr.replace(regex, '<mark>$1</mark>');
        }
        if (highlightedName.toLowerCase().includes(termLower)) {
          highlightedName = highlightedName.replace(regex, '<mark>$1</mark>');
        }
      }
      return `
        <li class="multi-select-option ${isSelected ? 'selected' : ''}" data-client-id="${client.client_id}">
          <div class="multi-select-checkbox">
            <i class="ri-check-line multi-select-checkbox-icon"></i>
          </div>
          <div class="multi-select-option-label">
            <span class="multi-select-option-client-id">${highlightedId}.</span>
            <span class="multi-select-option-client-name">${highlightedName}</span>
          </div>
        </li>
      `;
    })
    .join('');
  attachClickEvents(optionsContainer, toggleClientSelection);
}

export function renderClientOptions(
  clients: ClientWithRevenue[],
  searchTerm = '',
  selectedClientIds?: Set<string>,
  toggleClientSelection?: (clientId: string) => void
): void {
  const optionsContainer = document.getElementById('client-select-options');
  if (!optionsContainer) {
    console.error('[renderClientOptions] optionsContainer를 찾을 수 없습니다');
    return;
  }

  if (!clients || !Array.isArray(clients)) {
    optionsContainer.innerHTML =
      '<li class="multi-select-option empty">광고주 목록을 불러올 수 없습니다.</li>';
    return;
  }

  if (clients.length === 0) {
    optionsContainer.innerHTML = '<li class="multi-select-option empty">광고주가 없습니다.</li>';
    return;
  }

  const trimmedSearchTerm = searchTerm.trim();
  const ids = selectedClientIds ?? new Set<string>();
  const toggle = toggleClientSelection ?? (() => {});

  if (!trimmedSearchTerm) {
    renderAllClients(clients, ids, toggle, optionsContainer as HTMLElement);
    return;
  }

  const searchTerms = trimmedSearchTerm
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  if (searchTerms.length === 0) {
    renderAllClients(clients, ids, toggle, optionsContainer as HTMLElement);
    return;
  }

  const filteredClients = clients.filter((client) =>
    searchTerms.some((st) => {
      const searchLower = st.toLowerCase();
      const clientIdStr = String(client.client_id);
      const clientNameLower = (client.client_name ?? '').toLowerCase();
      return clientIdStr.includes(searchLower) || clientNameLower.includes(searchLower);
    })
  );

  if (filteredClients.length === 0) {
    optionsContainer.innerHTML = `<li class="multi-select-option empty">🔍 "${searchTerms.join(', ')}" 검색 결과가 없습니다</li>`;
    return;
  }

  renderFilteredClients(
    filteredClients,
    ids,
    toggle,
    optionsContainer as HTMLElement,
    searchTerms
  );
}

export function renderSelectedClients(
  selectedClientIds: Set<string>,
  _availableClients: ClientWithRevenue[] | undefined,
  _toggleClientSelection?: (clientId: string) => void
): void {
  devLog(
    `[renderSelectedClients] 호출됨. selectedClientIds.size: ${selectedClientIds.size}`
  );
  const tagsContainer = document.getElementById('selected-clients-tags');
  const wrapper = document.getElementById('client-select-wrapper');
  if (!tagsContainer) return;
  tagsContainer.innerHTML = '';
  if (wrapper) wrapper.classList.remove('has-tags');
}

export function renderSelectedClientsInRightPanel(
  selectedClientIds: Set<string>,
  availableClients: ClientWithRevenue[],
  toggleClientSelection: (clientId: string) => void
): void {
  const modalContainer = document.querySelector('#goal-register-modal .Modal__container');
  const rightPanel = document.getElementById('modal-right-section');
  if (!modalContainer || !rightPanel) return;

  if (selectedClientIds.size === 0) {
    rightPanel.classList.remove('expanded');
    rightPanel.style.display = 'none';
    modalContainer.classList.remove('has-right-panel');
    return;
  }

  const selectedClients = availableClients.filter((client) => {
    const clientIdStr = String(client.client_id);
    return selectedClientIds.has(clientIdStr) || selectedClientIds.has(String(client.client_id));
  });

  if (selectedClients.length === 0) {
    rightPanel.classList.remove('expanded');
    rightPanel.style.display = 'none';
    modalContainer.classList.remove('has-right-panel');
    return;
  }

  rightPanel.style.display = 'flex';
  rightPanel.classList.add('expanded');
  modalContainer.classList.add('has-right-panel');

  rightPanel.innerHTML = `
    <div class="modal-right-header">
      <h3 class="modal-right-title">선택된 광고주 (${selectedClients.length})</h3>
    </div>
    <div class="modal-right-content">
      ${selectedClients
        .map(
          (client) => `
        <div class="selected-client-item" data-client-id="${client.client_id}">
          <div class="selected-client-info">
            <span class="selected-client-id">${client.client_id}.</span>
            <span class="selected-client-name">${client.client_name ?? ''}</span>
          </div>
          <button type="button" class="selected-client-remove" data-client-id="${client.client_id}">
            <i class="ri-close-line"></i>
          </button>
        </div>
      `
        )
        .join('')}
    </div>
  `;

  rightPanel.querySelectorAll('.selected-client-remove').forEach((btn) => {
    btn.addEventListener('click', function (this: HTMLElement, e: Event) {
      e.stopPropagation();
      const clientId = this.dataset.clientId;
      if (clientId) toggleClientSelection(clientId);
    });
  });
}

export function calculateGoalRevenueFromPercentage(
  percentageText: string,
  lastPercentage: { value: number | null }
): boolean {
  const startRevenueInput = document.getElementById('start-revenue-input') as HTMLInputElement | null;
  const goalRevenueInput = document.getElementById('goal-revenue-input') as HTMLInputElement | null;
  if (!startRevenueInput || !goalRevenueInput) return false;

  const percentMatch = percentageText.match(/^(\d+(?:\.\d+)?)\s*%?$/);
  if (percentMatch) {
    const percentage = parseFloat(percentMatch[1]);
    const startRevenue = parseInt(startRevenueInput.value.replace(/,/g, ''), 10) || 0;
    if (startRevenue > 0) {
      const goalRevenue = Math.round(startRevenue * (percentage / 100));
      goalRevenueInput.value = goalRevenue.toLocaleString();
      lastPercentage.value = percentage;
      return true;
    }
  }
  return false;
}
