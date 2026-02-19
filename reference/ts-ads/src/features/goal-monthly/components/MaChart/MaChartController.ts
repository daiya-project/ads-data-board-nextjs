/**
 * Goal Monthly — MA 차트 지표 토글 및 전체 cleanup 분기
 *
 * REV/vCTR/CVR/CPC 전환 클릭 처리, 섹션 이탈 시 현재 지표별 cleanup 호출.
 * 상태(selectedMetric, lastManagerId)만 보유하고, 실제 렌더/cleanup은 deps로 주입.
 */

import { clearMaChartCache } from './MaChartCache';
import { MA_CHART_CANVAS_ID } from '../../lib/chart-constants';
import { renderMaChartVctrIntoSection, cleanupMaChartVctrSection } from './MaChartVctr';
import { renderMaChartCvrIntoSection, cleanupMaChartCvrSection } from './MaChartCvr';
import { renderMaChartCpcIntoSection, cleanupMaChartCpcSection } from './MaChartCpc';

/* ---------- 타입 ---------- */

export type MaChartMetric = 'rev' | 'vctr' | 'cvr' | 'cpc';

export interface MaChartControllerDeps {
  renderRev: (managerId: number | null) => Promise<void>;
  destroyRev: () => void;
  ensureCanvas: () => void;
  getTop8: (managerId: number | null) => Promise<number[]>;
  resetState: () => void;
}

/* ---------- 상태 ---------- */

let selectedMetric: MaChartMetric = 'rev';
let lastManagerId: number | null = null;

/* ---------- 토글 ---------- */

export function setLastManagerId(id: number | null): void {
  lastManagerId = id;
}

export function setSelectedMetric(metric: MaChartMetric): void {
  selectedMetric = metric;
}

/**
 * 지표 토글 버튼 이벤트 설정. 클릭 시 이전 지표 cleanup → 다음 지표 렌더.
 */
export function setupMetricToggle(container: HTMLElement, deps: MaChartControllerDeps): void {
  const toggle = container.querySelector('.MaChart__metric-toggle');
  if (!toggle) return;

  const buttons = toggle.querySelectorAll<HTMLButtonElement>('.MaChart__toggle-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const nextMetric = (btn.getAttribute('data-metric') ?? 'rev') as MaChartMetric;
      if (nextMetric === selectedMetric) return;

      const prevMetric = selectedMetric;
      selectedMetric = nextMetric;
      buttons.forEach((b) => b.classList.toggle('active', b === btn));

      if (prevMetric === 'rev') {
        deps.destroyRev();
      } else if (prevMetric === 'vctr') {
        cleanupMaChartVctrSection();
      } else if (prevMetric === 'cvr') {
        cleanupMaChartCvrSection();
      } else {
        cleanupMaChartCpcSection();
      }

      deps.ensureCanvas();
      const managerId = lastManagerId;

      if (nextMetric === 'rev') {
        await deps.renderRev(managerId);
      } else if (nextMetric === 'vctr' || nextMetric === 'cvr' || nextMetric === 'cpc') {
        const top8Ids = await deps.getTop8(managerId);
        if (nextMetric === 'vctr') {
          await renderMaChartVctrIntoSection(MA_CHART_CANVAS_ID, managerId, top8Ids);
        } else if (nextMetric === 'cvr') {
          await renderMaChartCvrIntoSection(MA_CHART_CANVAS_ID, managerId, top8Ids);
        } else {
          await renderMaChartCpcIntoSection(MA_CHART_CANVAS_ID, managerId, top8Ids);
        }
      }
    });
  });
}

/* ---------- cleanup ---------- */

export interface MaChartCleanupDeps {
  destroyRev: () => void;
  resetState: () => void;
}

/**
 * MA 차트 섹션 전체 정리 (페이지 이탈·필터 변경 시).
 * 현재 지표에 맞는 cleanup 호출 후 상태 초기화.
 */
export function cleanupMaChartRevenueSection(deps: MaChartCleanupDeps): void {
  if (selectedMetric === 'rev') {
    deps.destroyRev();
  } else if (selectedMetric === 'vctr') {
    cleanupMaChartVctrSection();
  } else if (selectedMetric === 'cvr') {
    cleanupMaChartCvrSection();
  } else {
    cleanupMaChartCpcSection();
  }
  deps.resetState();
  selectedMetric = 'rev';
  lastManagerId = null;
  clearMaChartCache();
}
