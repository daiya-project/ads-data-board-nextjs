/**
 * Goal Setting - Outbound Setting Modal
 * 신규 광고주(아웃바운드) 기간 설정 모달 (메인 진입점 및 UI 오케스트레이션)
 */

import { showToast } from '@shared/lib';
import type { OutboundRecord, LoadManagerSettingFn } from './outbound-modal-types';
import { calculateEndDate } from './outbound-modal-data';
import { buildCalendarHTML } from './outbound-modal-calendar';
import {
  saveOutboundRecord,
  updateOutboundRecord,
  deleteOutboundRecord,
  logOutboundError,
} from './outbound-modal-db';

export type { OutboundRecord } from './outbound-modal-types';
export { loadOutboundPeriods, calculateEndDate } from './outbound-modal-data';

const MODAL_ID = 'outbound-setting-modal';

let currentEditingField: 'start' | 'end' = 'start';
let currentStartDate: string | null = null;
let currentEndDate: string | null = null;
let originalStartDate: string | null = null;
let originalEndDate: string | null = null;
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth() + 1;
let currentClientId: number | null = null;
let currentClientName = '';
let currentRecord: OutboundRecord | null = null;
let loadManagerSettingRef: LoadManagerSettingFn | null = null;

export function setupOutboundButtonHandlers(
  outboundMap: Map<number, OutboundRecord>,
  reloadFn: LoadManagerSettingFn
): void {
  loadManagerSettingRef = reloadFn;

  const buttons = document.querySelectorAll<HTMLButtonElement>('.outbound-setting-btn');
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    if (btn.hasAttribute('data-outbound-listener-attached')) return;
    btn.setAttribute('data-outbound-listener-attached', 'true');

    btn.addEventListener('click', () => {
      const clientId = parseInt(btn.dataset.clientId ?? '', 10);
      const clientName = btn.dataset.clientName ?? '';
      const record = outboundMap.get(clientId) ?? null;
      openOutboundSettingModal(clientId, clientName, record);
    });
  });
}

function openOutboundSettingModal(
  clientId: number,
  clientName: string,
  record: OutboundRecord | null
): void {
  closeOutboundSettingModal();

  currentClientId = clientId;
  currentClientName = clientName || `Client ${clientId}`;
  currentRecord = record;
  currentEditingField = 'start';

  if (record) {
    currentStartDate = record.outbound_start;
    currentEndDate = record.outbound_end;
    originalStartDate = record.outbound_start;
    originalEndDate = record.outbound_end;
    const [y, m] = record.outbound_start.split('-').map(Number);
    calendarYear = y;
    calendarMonth = m;
  } else {
    currentStartDate = null;
    currentEndDate = null;
    originalStartDate = null;
    originalEndDate = null;
    const now = new Date();
    calendarYear = now.getFullYear();
    calendarMonth = now.getMonth() + 1;
  }

  renderModal();
}

export function closeOutboundSettingModal(): void {
  const existing = document.getElementById(MODAL_ID);
  if (existing) {
    existing.classList.remove('active');
    setTimeout(() => existing.remove(), 200);
  }
  document.removeEventListener('keydown', handleEscKey);
  currentClientId = null;
  currentRecord = null;
  currentStartDate = null;
  currentEndDate = null;
  originalStartDate = null;
  originalEndDate = null;
}

function renderModal(): void {
  const overlay = document.createElement('div');
  overlay.id = MODAL_ID;
  overlay.className = 'outbound-setting-overlay';
  overlay.innerHTML = buildModalHTML();

  overlay.addEventListener('click', handleOverlayClick);
  document.addEventListener('keydown', handleEscKey);

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('active'));
}

function refreshModalContent(): void {
  const overlay = document.getElementById(MODAL_ID);
  if (!overlay) return;
  overlay.innerHTML = buildModalHTML();
}

function buildModalHTML(): string {
  const isExisting = currentRecord !== null;
  const hasChanged = isExisting && (
    currentStartDate !== originalStartDate || currentEndDate !== originalEndDate
  );

  const calendarHTML = buildCalendarHTML(
    calendarYear,
    calendarMonth,
    currentStartDate,
    currentEndDate
  );

  let dateInfoHTML: string;
  if (currentStartDate && currentEndDate) {
    dateInfoHTML = `
      <div class="outbound-setting-dates">
        <span class="outbound-setting-date-item ${currentEditingField === 'start' ? 'active' : ''}" data-field="start">
          ${currentStartDate}
        </span>
        <span class="outbound-setting-date-separator">~</span>
        <span class="outbound-setting-date-item ${currentEditingField === 'end' ? 'active' : ''}" data-field="end">
          ${currentEndDate}
        </span>
      </div>
    `;
  } else {
    dateInfoHTML = '<p class="outbound-setting-guide">시작 일자를 선택하세요</p>';
  }

  let buttonsHTML = '';
  if (isExisting) {
    if (hasChanged) {
      buttonsHTML = `
        <div class="outbound-setting-actions">
          <button type="button" class="outbound-setting-action-btn outbound-setting-action-btn--danger" data-action="delete">신규 광고주 해제</button>
          <button type="button" class="outbound-setting-action-btn outbound-setting-action-btn--primary" data-action="update">수정</button>
        </div>`;
    } else {
      buttonsHTML = `
        <div class="outbound-setting-actions">
          <button type="button" class="outbound-setting-action-btn outbound-setting-action-btn--danger" data-action="delete">신규 광고주 해제</button>
          <button type="button" class="outbound-setting-action-btn outbound-setting-action-btn--close" data-action="close">닫기</button>
        </div>`;
    }
  } else if (currentStartDate && currentEndDate) {
    buttonsHTML = `
      <div class="outbound-setting-actions">
        <button type="button" class="outbound-setting-action-btn outbound-setting-action-btn--primary" data-action="save">저장</button>
      </div>`;
  }

  return `
    <div class="outbound-setting-content">
      <div class="outbound-setting-header">
        <h3 class="outbound-setting-title">${currentClientName}</h3>
        <span class="outbound-setting-subtitle">신규 광고주 설정</span>
      </div>
      <div class="outbound-setting-body">
        ${dateInfoHTML}
        <div class="outbound-setting-calendar">
          ${calendarHTML}
        </div>
      </div>
      ${buttonsHTML}
    </div>
  `;
}

function handleOverlayClick(e: Event): void {
  const target = e.target as HTMLElement;

  if (target.id === MODAL_ID) {
    closeOutboundSettingModal();
    return;
  }

  if (target.closest('[data-action="prev-month"]')) {
    calendarMonth--;
    if (calendarMonth < 1) { calendarMonth = 12; calendarYear--; }
    refreshModalContent();
    return;
  }
  if (target.closest('[data-action="next-month"]')) {
    calendarMonth++;
    if (calendarMonth > 12) { calendarMonth = 1; calendarYear++; }
    refreshModalContent();
    return;
  }

  const dayEl = target.closest('.outbound-cal-day') as HTMLElement | null;
  if (dayEl?.dataset.date) {
    handleDayClick(dayEl.dataset.date);
    return;
  }

  const dateItem = target.closest('.outbound-setting-date-item') as HTMLElement | null;
  if (dateItem?.dataset.field) {
    currentEditingField = dateItem.dataset.field as 'start' | 'end';
    const dateToShow = currentEditingField === 'start' ? currentStartDate : currentEndDate;
    if (dateToShow) {
      const [y, m] = dateToShow.split('-').map(Number);
      calendarYear = y;
      calendarMonth = m;
    }
    refreshModalContent();
    return;
  }

  const actionBtn = target.closest('[data-action]') as HTMLElement | null;
  if (actionBtn) {
    const action = actionBtn.dataset.action;
    if (action === 'save') handleSave();
    else if (action === 'update') handleUpdate();
    else if (action === 'delete') handleDelete();
    else if (action === 'close') closeOutboundSettingModal();
  }
}

function handleDayClick(dateStr: string): void {
  if (currentEditingField === 'start') {
    currentStartDate = dateStr;
    currentEndDate = calculateEndDate(dateStr);
  } else {
    currentEndDate = dateStr;
  }
  refreshModalContent();
}

function handleEscKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeOutboundSettingModal();
}

async function handleSave(): Promise<void> {
  if (!currentClientId || !currentStartDate || !currentEndDate) return;

  if (currentStartDate > currentEndDate) {
    showToast('시작 일자는 종료 일자보다 이전이어야 합니다.');
    return;
  }

  try {
    await saveOutboundRecord(currentClientId, currentStartDate, currentEndDate);
    closeOutboundSettingModal();
    if (loadManagerSettingRef) loadManagerSettingRef();
  } catch (err) {
    logOutboundError('저장 실패', err);
    showToast(`❌ 저장 실패: ${(err as Error).message}`);
  }
}

async function handleUpdate(): Promise<void> {
  if (!currentRecord || !currentStartDate || !currentEndDate) return;

  if (currentStartDate > currentEndDate) {
    showToast('시작 일자는 종료 일자보다 이전이어야 합니다.');
    return;
  }

  try {
    await updateOutboundRecord(currentRecord.id, currentStartDate, currentEndDate);
    closeOutboundSettingModal();
    if (loadManagerSettingRef) loadManagerSettingRef();
  } catch (err) {
    logOutboundError('수정 실패', err);
    showToast(`❌ 수정 실패: ${(err as Error).message}`);
  }
}

async function handleDelete(): Promise<void> {
  if (!currentClientId) return;

  try {
    await deleteOutboundRecord(currentClientId);
    closeOutboundSettingModal();
    if (loadManagerSettingRef) loadManagerSettingRef();
  } catch (err) {
    logOutboundError('삭제 실패', err);
    showToast(`❌ 삭제 실패: ${(err as Error).message}`);
  }
}
