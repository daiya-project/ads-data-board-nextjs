/**
 * 데이터 업데이트 모달 (JS-First)
 * _backup/index.html L817~L882 마크업 + 기존 data-update-modal.ts 로직 이식.
 */

import { devLog, getLatestDateFromDb } from '@shared/lib';
import { updateDataFromCSV, forceUpdateDataFromCSV, CSV_SOURCE_URL } from '@shared/lib';
import './DataUpdateModal.css';

export class DataUpdateModal {
  private root: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private closeBtn: HTMLElement | null = null;
  private openCsvBtn: HTMLElement | null = null;
  private importBtn: HTMLButtonElement | null = null;
  private progressArea: HTMLElement | null = null;
  private progressBar: HTMLElement | null = null;
  private progressStatus: HTMLElement | null = null;
  private progressDetail: HTMLElement | null = null;
  private forceCheckbox: HTMLInputElement | null = null;
  private forceDateRange: HTMLElement | null = null;
  private forceStartInput: HTMLInputElement | null = null;
  private forceEndInput: HTMLInputElement | null = null;
  private latestDateEl: HTMLElement | null = null;
  private isForceMode = false;

  private boundClose = () => this.close();
  private boundOverlayClick = (e: Event) => { if (e.target === this.overlay) this.close(); };
  private boundCsvClick = () => { window.open(CSV_SOURCE_URL, '_blank'); };
  private boundImportClick = () => this.handleImportClick();
  private boundForceChange = () => { this.toggleForceMode(this.forceCheckbox?.checked ?? false); };

  render(container: HTMLElement): void {
    const html = `
      <div id="data-update-modal" class="DataUpdateModal__overlay">
        <div class="DataUpdateModal__modal">
          <div class="DataUpdateModal__header">
            <h3 class="DataUpdateModal__title">
              <i class="ri-database-2-line"></i>
              Data Import
            </h3>
            <button class="DataUpdateModal__close" id="data-update-modal-close" type="button">
              <i class="ri-close-line"></i>
            </button>
          </div>
          <div class="DataUpdateModal__body">
            <div class="DataUpdateModal__desc">
              <a href="https://redash.dable.io/queries/12601/" target="_blank" rel="noopener noreferrer" class="DataUpdateModal__codeLink">&lt;/&gt;</a> 를 통해 데이터를 조회하여 데이터를 CSV에 입력합니다
            </div>
            <div class="DataUpdateModal__desc">
              Google Sheets CSV 데이터를 데이터베이스에 동기화합니다.
            </div>
            <p class="DataUpdateModal__latestDate" id="data-update-latest-date-msg" style="display:none;"></p>
            <div class="DataUpdateModal__forceSection">
              <label class="DataUpdateModal__forceToggle">
                <input type="checkbox" id="data-update-force-checkbox">
                <span class="DataUpdateModal__forceToggleTrack">
                  <span class="DataUpdateModal__forceToggleThumb"></span>
                </span>
                <span class="DataUpdateModal__forceToggleLabel">강제 업데이트</span>
              </label>
              <div class="DataUpdateModal__forceDateRange" id="data-update-force-date-range" style="display:none;">
                <div class="DataUpdateModal__forceDateRow">
                  <div class="DataUpdateModal__forceDateField">
                    <label class="DataUpdateModal__forceDateLabel">시작일</label>
                    <input type="date" class="DataUpdateModal__forceDateInput" id="data-update-force-start">
                  </div>
                  <span class="DataUpdateModal__forceDateSeparator">~</span>
                  <div class="DataUpdateModal__forceDateField">
                    <label class="DataUpdateModal__forceDateLabel">종료일</label>
                    <input type="date" class="DataUpdateModal__forceDateInput" id="data-update-force-end">
                  </div>
                </div>
                <p class="DataUpdateModal__forceWarning">
                  <i class="ri-error-warning-line"></i>
                  지정 기간의 기존 데이터를 삭제 후 재업로드합니다.
                </p>
              </div>
            </div>
            <div class="DataUpdateModal__actions">
              <button class="DataUpdateModal__btnCsv" id="data-update-open-csv" type="button">
                <i class="ri-file-text-line"></i>
                <span>CSV</span>
              </button>
              <button class="DataUpdateModal__btnImport" id="data-update-import" type="button">
                <i class="ri-upload-cloud-2-line"></i>
                <span>IMPORT</span>
              </button>
            </div>
            <div class="DataUpdateModal__progressArea" id="data-update-progress-area" style="display:none;">
              <div class="DataUpdateModal__progressStatus" id="data-update-progress-status">준비 중...</div>
              <div class="DataUpdateModal__progressTrack">
                <div class="DataUpdateModal__progressBar" id="data-update-progress-bar"></div>
              </div>
              <div class="DataUpdateModal__progressDetail" id="data-update-progress-detail"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    this.root = container.lastElementChild as HTMLElement;
    this.overlay = this.root;

    this.closeBtn = this.root.querySelector('#data-update-modal-close');
    this.openCsvBtn = this.root.querySelector('#data-update-open-csv');
    this.importBtn = this.root.querySelector('#data-update-import');
    this.progressArea = this.root.querySelector('#data-update-progress-area');
    this.progressBar = this.root.querySelector('#data-update-progress-bar');
    this.progressStatus = this.root.querySelector('#data-update-progress-status');
    this.progressDetail = this.root.querySelector('#data-update-progress-detail');
    this.forceCheckbox = this.root.querySelector('#data-update-force-checkbox');
    this.forceDateRange = this.root.querySelector('#data-update-force-date-range');
    this.forceStartInput = this.root.querySelector('#data-update-force-start');
    this.forceEndInput = this.root.querySelector('#data-update-force-end');
    this.latestDateEl = this.root.querySelector('#data-update-latest-date-msg');

    this.closeBtn?.addEventListener('click', this.boundClose);
    this.overlay?.addEventListener('click', this.boundOverlayClick);
    this.openCsvBtn?.addEventListener('click', this.boundCsvClick);
    this.importBtn?.addEventListener('click', this.boundImportClick);
    this.forceCheckbox?.addEventListener('change', this.boundForceChange);
  }

  open(): void {
    if (!this.overlay) return;
    if (this.progressArea) {
      this.progressArea.style.display = 'none';
      this.progressArea.classList.remove('done', 'error');
    }
    if (this.progressBar) this.progressBar.style.width = '0%';
    if (this.progressStatus) this.progressStatus.textContent = '';
    if (this.progressDetail) this.progressDetail.textContent = '';
    if (this.importBtn) this.importBtn.disabled = false;
    this.resetForceMode();
    if (this.latestDateEl) {
      this.latestDateEl.style.display = 'none';
      this.latestDateEl.textContent = '';
    }
    this.overlay.classList.add('active');
    getLatestDateFromDb().then((date) => {
      if (!this.latestDateEl) return;
      if (date) {
        this.latestDateEl.textContent = `현재 ${date}까지의 데이터가 집계되어 있습니다.`;
        this.latestDateEl.style.display = 'block';
      }
    });
  }

  close(): void {
    this.overlay?.classList.remove('active');
  }

  private toggleForceMode(enabled: boolean): void {
    this.isForceMode = enabled;
    if (this.forceDateRange) this.forceDateRange.style.display = enabled ? 'block' : 'none';
    if (this.importBtn) {
      const icon = this.importBtn.querySelector('i');
      const label = this.importBtn.querySelector('span');
      if (enabled) {
        this.importBtn.classList.add('DataUpdateModal__btnImport--force');
        if (icon) icon.className = 'ri-alert-line';
        if (label) label.textContent = '강제 Import';
      } else {
        this.importBtn.classList.remove('DataUpdateModal__btnImport--force');
        if (icon) icon.className = 'ri-upload-cloud-2-line';
        if (label) label.textContent = 'IMPORT';
      }
    }
  }

  private resetForceMode(): void {
    this.isForceMode = false;
    if (this.forceCheckbox) this.forceCheckbox.checked = false;
    if (this.forceDateRange) this.forceDateRange.style.display = 'none';
    if (this.forceStartInput) this.forceStartInput.value = '';
    if (this.forceEndInput) this.forceEndInput.value = '';
    this.toggleForceMode(false);
  }

  private async handleImportClick(): Promise<void> {
    if (this.isForceMode) {
      const startDate = this.forceStartInput?.value;
      const endDate = this.forceEndInput?.value;
      if (!startDate || !endDate) {
        if (this.progressArea) { this.progressArea.style.display = 'block'; this.progressArea.classList.add('error'); }
        if (this.progressStatus) this.progressStatus.textContent = '오류';
        if (this.progressDetail) this.progressDetail.textContent = '시작일과 종료일을 모두 선택해주세요.';
        return;
      }
      if (startDate > endDate) {
        if (this.progressArea) { this.progressArea.style.display = 'block'; this.progressArea.classList.add('error'); }
        if (this.progressStatus) this.progressStatus.textContent = '오류';
        if (this.progressDetail) this.progressDetail.textContent = '시작일이 종료일보다 클 수 없습니다.';
        return;
      }
    }

    if (this.importBtn) this.importBtn.disabled = true;
    if (this.openCsvBtn) (this.openCsvBtn as HTMLButtonElement).disabled = true;
    if (this.progressArea) {
      this.progressArea.style.display = 'block';
      this.progressArea.classList.remove('done', 'error');
    }

    try {
      const progressCallback = (info: { stage: string; percent: number; detail?: string }) => {
        if (this.progressBar) this.progressBar.style.width = `${info.percent}%`;
        if (this.progressStatus) this.progressStatus.textContent = info.stage;
        if (this.progressDetail) this.progressDetail.textContent = info.detail ?? '';
      };
      if (this.isForceMode && this.forceStartInput && this.forceEndInput) {
        await forceUpdateDataFromCSV(this.forceStartInput.value, this.forceEndInput.value, progressCallback);
      } else {
        await updateDataFromCSV(progressCallback);
      }
      if (this.progressArea) this.progressArea.classList.add('done');
      if (this.progressBar) this.progressBar.style.width = '100%';
      if (this.progressStatus) this.progressStatus.textContent = '업로드 완료';
      const toastMsg = this.isForceMode ? '강제 업데이트가 완료되었습니다' : '데이터 업데이트가 완료되었습니다';
      setTimeout(() => {
        this.close();
        localStorage.setItem('data-update-toast', toastMsg);
        window.location.reload();
      }, 800);
    } catch (error) {
      devLog('업데이트 오류:', error);
      const msg = error instanceof Error ? error.message : String(error);
      if (this.progressArea) { this.progressArea.classList.add('error'); this.progressArea.style.display = 'block'; }
      if (this.progressStatus) this.progressStatus.textContent = '오류 발생';
      if (this.progressDetail) this.progressDetail.textContent = msg;
      if (this.importBtn) this.importBtn.disabled = false;
      if (this.openCsvBtn) (this.openCsvBtn as HTMLButtonElement).disabled = false;
    }
  }

  destroy(): void {
    this.closeBtn?.removeEventListener('click', this.boundClose);
    this.overlay?.removeEventListener('click', this.boundOverlayClick);
    this.openCsvBtn?.removeEventListener('click', this.boundCsvClick);
    this.importBtn?.removeEventListener('click', this.boundImportClick);
    this.forceCheckbox?.removeEventListener('change', this.boundForceChange);
    this.root?.remove();
    this.root = null;
    this.overlay = null;
    this.closeBtn = null;
    this.openCsvBtn = null;
    this.importBtn = null;
    this.progressArea = null;
    this.progressBar = null;
    this.progressStatus = null;
    this.progressDetail = null;
    this.forceCheckbox = null;
    this.forceDateRange = null;
    this.forceStartInput = null;
    this.forceEndInput = null;
    this.latestDateEl = null;
  }
}

let instance: DataUpdateModal | null = null;

export function renderDataUpdateModal(container: HTMLElement): void {
  instance = new DataUpdateModal();
  instance.render(container);
}

export function openDataUpdateModal(): void {
  instance?.open();
}

export function closeDataUpdateModal(): void {
  instance?.close();
}

/** 사이드바의 Update Data 버튼에만 바인딩 (모달 내부 이벤트는 render 시 이미 바인딩됨) */
export function setupDataUpdateModal(): void {
  const updateBtn = document.querySelector('.update-btn');
  if (updateBtn) updateBtn.addEventListener('click', () => openDataUpdateModal());
}
