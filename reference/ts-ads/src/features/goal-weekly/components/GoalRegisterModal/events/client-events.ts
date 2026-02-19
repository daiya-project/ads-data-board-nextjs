/**
 * 목표 등록 - 광고주 선택 이벤트 핸들러
 */

import type { GoalRegisterContext } from '@shared/types';
import type { ClientWithRevenue } from '../services/client-loader';

declare global {
  interface Window {
    goalRegisterState?: { availableClients?: ClientWithRevenue[] };
    goalRegisterDropdownCloseHandler?: (e: MouseEvent) => void;
  }
}

export function setupClientDropdownEvents(context: GoalRegisterContext): void {
  const clientSelectDropdown = document.getElementById('client-select-dropdown');
  const clientSelectToggle = document.getElementById('client-select-toggle');
  const clientSearchInput = document.getElementById(
    'client-search-input'
  ) as HTMLInputElement | null;

  console.log('[드롭다운 이벤트 설정]', {
    dropdown: !!clientSelectDropdown,
    toggle: !!clientSelectToggle,
    searchInput: !!clientSearchInput,
  });

  if (clientSelectToggle) {
    const newToggle = clientSelectToggle.cloneNode(true) as HTMLElement;
    clientSelectToggle.parentNode?.replaceChild(newToggle, clientSelectToggle);

    newToggle.addEventListener('click', async function (e) {
      console.log('[드롭다운 토글] 클릭됨!');
      e.stopPropagation();
      const dropdown = document.getElementById('client-select-dropdown');
      const toggle = document.getElementById('client-select-toggle');
      const searchInput = document.getElementById(
        'client-search-input'
      ) as HTMLInputElement | null;

      if (dropdown) {
        const isActive = dropdown.classList.contains('active');
        console.log('[드롭다운 토글] 현재 상태:', isActive ? '열림' : '닫힘');
        if (isActive) {
          dropdown.classList.remove('active');
          if (toggle) toggle.classList.remove('active');
          console.log('[드롭다운 토글] 드롭다운 닫음');
        } else {
          dropdown.classList.add('active');
          if (toggle) toggle.classList.add('active');
          console.log('[드롭다운 토글] 드롭다운 열림');

          if (searchInput) {
            searchInput.value = '';
          }

          let availableClients: ClientWithRevenue[] =
            window.goalRegisterState?.availableClients ??
            (context.availableClients as ClientWithRevenue[]) ??
            [];

          if (
            availableClients.length === 0 &&
            context.loadClientList
          ) {
            const managerSelect = document.getElementById(
              'goal-manager-select'
            ) as HTMLSelectElement | null;
            const managerId = managerSelect
              ? parseInt(managerSelect.value, 10)
              : NaN;
            if (managerId) {
              await context.loadClientList(managerId);
              availableClients =
                window.goalRegisterState?.availableClients ?? [];
            }
          }

          if (
            context.renderClientOptions &&
            availableClients.length > 0
          ) {
            context.renderClientOptions(availableClients, '');
          }
        }
      }
    });
  }

  if (clientSearchInput) {
    clientSearchInput.onfocus = null;
    clientSearchInput.addEventListener('focus', async function (this: HTMLInputElement) {
      this.value = '';
      if (clientSelectDropdown) {
        clientSelectDropdown.classList.add('active');
        if (clientSelectToggle) clientSelectToggle.classList.add('active');

        let availableClients: ClientWithRevenue[] =
          window.goalRegisterState?.availableClients ??
          (context.availableClients as ClientWithRevenue[]) ??
          [];

        if (
          availableClients.length === 0 &&
          context.loadClientList
        ) {
          const managerSelect = document.getElementById(
            'goal-manager-select'
          ) as HTMLSelectElement | null;
          const managerId = managerSelect
            ? parseInt(managerSelect.value, 10)
            : NaN;
          if (managerId) {
            await context.loadClientList(managerId);
            availableClients =
              window.goalRegisterState?.availableClients ?? [];
          }
        }

        if (
          context.renderClientOptions &&
          availableClients.length > 0
        ) {
          context.renderClientOptions(availableClients, '');
        }
      }
    });

    let searchTimeout: ReturnType<typeof setTimeout>;
    clientSearchInput.addEventListener('input', async function (
      this: HTMLInputElement,
      e: Event
    ) {
      clearTimeout(searchTimeout);
      const searchTerm = (e.target as HTMLInputElement).value.trim();

      searchTimeout = setTimeout(async () => {
        if (context.renderClientOptions) {
          let availableClients: ClientWithRevenue[] =
            window.goalRegisterState?.availableClients ??
            (context.availableClients as ClientWithRevenue[]) ??
            [];

          if (
            availableClients.length === 0 &&
            context.loadClientList
          ) {
            const managerSelect = document.getElementById(
              'goal-manager-select'
            ) as HTMLSelectElement | null;
            const managerId = managerSelect
              ? parseInt(managerSelect.value, 10)
              : NaN;
            if (managerId) {
              await context.loadClientList(managerId);
              availableClients =
                window.goalRegisterState?.availableClients ?? [];
            }
          }

          if (!searchTerm) {
            context.renderClientOptions(availableClients, '');
            return;
          }

          if (searchTerm.includes(',')) {
            const terms = searchTerm
              .split(',')
              .map((t) => t.trim())
              .filter((t) => t.length >= 2);
            if (terms.length > 0) {
              context.renderClientOptions(availableClients, searchTerm);
            }
          } else if (searchTerm.length >= 2) {
            context.renderClientOptions(availableClients, searchTerm);
          } else {
            context.renderClientOptions(availableClients, '');
          }
        }
      }, 300);
    });

    clientSearchInput.addEventListener('click', async function () {
      if (clientSelectDropdown) {
        const wasActive = clientSelectDropdown.classList.contains('active');
        clientSelectDropdown.classList.add('active');
        if (clientSelectToggle) clientSelectToggle.classList.add('active');

        if (!wasActive && context.renderClientOptions) {
          let availableClients: ClientWithRevenue[] =
            window.goalRegisterState?.availableClients ??
            (context.availableClients as ClientWithRevenue[]) ??
            [];

          if (
            availableClients.length === 0 &&
            context.loadClientList
          ) {
            const managerSelect = document.getElementById(
              'goal-manager-select'
            ) as HTMLSelectElement | null;
            const managerId = managerSelect
              ? parseInt(managerSelect.value, 10)
              : NaN;
            if (managerId) {
              await context.loadClientList(managerId);
              availableClients =
                window.goalRegisterState?.availableClients ?? [];
            }
          }

          context.renderClientOptions(availableClients, '');
        }
      }
    });
  }

  const clientSelectDone = document.getElementById('client-select-done');
  if (clientSelectDone) {
    clientSelectDone.onclick = null;
    clientSelectDone.addEventListener('click', function (e) {
      e.stopPropagation();
      if (clientSelectDropdown) clientSelectDropdown.classList.remove('active');
      if (clientSelectToggle) clientSelectToggle.classList.remove('active');
      if (clientSearchInput) clientSearchInput.value = '';
    });
  }

  const clientSelectClearAll = document.getElementById('client-select-clear-all');
  if (clientSelectClearAll) {
    clientSelectClearAll.onclick = null;
    clientSelectClearAll.addEventListener('click', function (e) {
      e.stopPropagation();
      if (context.clearAllClients) context.clearAllClients();
    });
  }

  if (clientSelectDropdown) {
    clientSelectDropdown.onclick = null;
    clientSelectDropdown.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  const clientSelectWrapper = document.getElementById('client-select-wrapper');
  if (clientSelectWrapper) {
    clientSelectWrapper.onclick = null;
    clientSelectWrapper.addEventListener('click', function (e) {
      if (
        !(e.target as Element).closest('.client-tag') &&
        e.target !== clientSelectToggle
      ) {
        const wasActive =
          clientSelectDropdown?.classList.contains('active') ?? false;

        if (clientSelectDropdown && !wasActive) {
          clientSelectDropdown.classList.add('active');

          if (context.renderClientOptions) {
            const availableClients: ClientWithRevenue[] =
              window.goalRegisterState?.availableClients ??
              (context.availableClients as ClientWithRevenue[]) ??
              [];
            context.renderClientOptions(availableClients, '');
          }
        }
        if (clientSelectToggle) clientSelectToggle.classList.add('active');
        if (
          clientSearchInput &&
          (e.target as Element) !== clientSearchInput
        ) {
          setTimeout(() => clientSearchInput.focus(), 0);
        }
      }
    });
  }

  if (!window.goalRegisterDropdownCloseHandler) {
    window.goalRegisterDropdownCloseHandler = function (e: MouseEvent) {
      if (clientSelectDropdown && clientSelectWrapper) {
        if (
          !clientSelectWrapper.contains(e.target as Node) &&
          !clientSelectDropdown.contains(e.target as Node)
        ) {
          clientSelectDropdown.classList.remove('active');
          if (clientSelectToggle) clientSelectToggle.classList.remove('active');
        }
      }
    };
    document.addEventListener('click', window.goalRegisterDropdownCloseHandler);
  }
}
