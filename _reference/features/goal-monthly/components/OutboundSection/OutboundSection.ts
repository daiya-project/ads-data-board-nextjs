/**
 * Goal > Monthly - Manager ID 3 Outbound 신규 광고주 분석 섹션
 *
 * 메인 조합 로직 및 공개 API
 */

import { devLog, handleError, chartRegistry, formatNumberWithCommas } from '@shared/lib';
import type { Outbound3MonthChartData, OutboundMonthlyCardData, OutboundWeeklyInfo, ChartMode } from './outbound-types';
import { CANVAS_ID } from './outbound-constants';
import {
  getMostRecentDate,
  getNewAdvertiser3MonthChartData,
  getNewAdvertiserWeeklyChartData,
  getOutboundMonthlyCardData,
} from './outbound-data';
import { renderOutbound3MonthChart, cleanupOutboundChart } from './outbound-chart';
import {
  openMonthlyDetailModal,
  closeDailyDetailModal,
  closeWeeklyDetailModal,
  closeMonthlyDetailModal,
} from './outbound-modals';

/* ---------- 모듈 상태 ---------- */

let currentChartMode: ChartMode = 'weekly';
let cachedDailyChartData: Outbound3MonthChartData | null = null;
let cachedWeeklyChartData: Outbound3MonthChartData | null = null;
let cachedWeekRanges: OutboundWeeklyInfo[] = [];

/* ---------- UI 렌더링 ---------- */

function createOutboundSectionHTML(): string {
  return `
    <div class="OutboundSection__root">
      <div class="OutboundSection__titleRow">
        <h2 class="OutboundSection__sectionTitle">Out Bound</h2>
        <div class="OutboundSection__chartToggle" id="outbound-chart-toggle">
          <button class="OutboundSection__toggleBtn" data-mode="daily">일간</button>
          <button class="OutboundSection__toggleBtn active" data-mode="weekly">주간</button>
        </div>
      </div>
      <div class="OutboundSection__cumulativeWrapper">
        <canvas id="${CANVAS_ID}"></canvas>
      </div>
      <div id="outbound-monthly-cards-container"></div>
    </div>
  `;
}

function renderMonthlyCardsHTML(data: OutboundMonthlyCardData[]): string {
  if (!data.length) {
    return '<div class="empty-state">데이터가 없습니다.</div>';
  }

  const cards = data.map(item => {
    const [yearStr, monthStr] = item.month.split('-');
    const monthLabel = `${yearStr}년 ${monthStr}월`;
    return `
      <div class="OutboundSection__monthlyCard" data-month="${item.month}" style="cursor:pointer">
        <span class="OutboundSection__cardMonth">${monthLabel}</span>
        <div class="OutboundSection__cardRow">
          <span class="OutboundSection__cardLabel">매출</span>
          <span class="OutboundSection__cardValue">${formatNumberWithCommas(Math.round(item.revenue))}</span>
        </div>
        <div class="OutboundSection__cardRow">
          <span class="OutboundSection__cardLabel">활성 광고주</span>
          <span class="OutboundSection__cardValue">${item.activeClients}<span class="OutboundSection__cardUnit">개</span></span>
        </div>
      </div>
    `;
  }).join('');

  return `<div class="OutboundSection__cardsRow">${cards}</div>`;
}

/* ---------- 차트 모드 전환 ---------- */

function renderCurrentOutboundChart(): void {
  if (currentChartMode === 'weekly' && cachedWeeklyChartData && cachedWeeklyChartData.dailyValues.some(v => v !== null)) {
    renderOutbound3MonthChart(CANVAS_ID, cachedWeeklyChartData, 'weekly', cachedWeekRanges);
  } else if (currentChartMode === 'daily' && cachedDailyChartData && cachedDailyChartData.dailyValues.some(v => v !== null)) {
    renderOutbound3MonthChart(CANVAS_ID, cachedDailyChartData, 'daily');
  }
}

function handleChartToggle(newMode: ChartMode): void {
  if (newMode === currentChartMode) return;
  currentChartMode = newMode;

  const toggle = document.getElementById('outbound-chart-toggle');
  if (toggle) {
    toggle.querySelectorAll('.OutboundSection__toggleBtn').forEach(btn => {
      const btnMode = (btn as HTMLElement).dataset.mode;
      btn.classList.toggle('active', btnMode === newMode);
    });
  }

  renderCurrentOutboundChart();
}

/* ---------- 메인 렌더링 ---------- */

export async function renderOutboundSection(containerId: string): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) {
    devLog('[Outbound] container not found:', containerId);
    return;
  }

  try {
    currentChartMode = 'weekly';
    container.innerHTML = createOutboundSectionHTML();

    const recentDate = await getMostRecentDate();
    if (!recentDate) {
      devLog('[Outbound] 최신 날짜 없음');
      return;
    }

    const [dailyData, weeklyResult, cardData] = await Promise.all([
      getNewAdvertiser3MonthChartData(recentDate),
      getNewAdvertiserWeeklyChartData(recentDate),
      getOutboundMonthlyCardData(),
    ]);

    cachedDailyChartData = dailyData;
    cachedWeeklyChartData = weeklyResult?.chartData ?? null;
    cachedWeekRanges = weeklyResult?.weekRanges ?? [];

    renderCurrentOutboundChart();

    const toggle = document.getElementById('outbound-chart-toggle');
    if (toggle) {
      toggle.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('.OutboundSection__toggleBtn') as HTMLElement | null;
        if (btn && btn.dataset.mode) {
          handleChartToggle(btn.dataset.mode as ChartMode);
        }
      });
    }

    const cardsContainer = document.getElementById('outbound-monthly-cards-container');
    if (cardsContainer) {
      cardsContainer.innerHTML = renderMonthlyCardsHTML(cardData);

      cardsContainer.querySelectorAll('.OutboundSection__monthlyCard[data-month]').forEach(card => {
        card.addEventListener('click', () => {
          const month = (card as HTMLElement).dataset.month;
          if (month) openMonthlyDetailModal(month);
        });
      });
    }
  } catch (error) {
    devLog('[Outbound] 렌더링 실패:', error);
    handleError(error, 'outbound-section', '아웃바운드 섹션을 로드할 수 없습니다.');
    container.innerHTML = `
      <div class="OutboundSection__root">
        <div class="empty-state error-state">
          <p>아웃바운드 섹션을 로드할 수 없습니다.</p>
        </div>
      </div>
    `;
  }
}

/* ---------- 정리 ---------- */

export function cleanupOutboundSection(): void {
  cleanupOutboundChart(CANVAS_ID);
  chartRegistry.destroy(CANVAS_ID);
  closeDailyDetailModal();
  closeWeeklyDetailModal();
  closeMonthlyDetailModal();
  cachedDailyChartData = null;
  cachedWeeklyChartData = null;
  cachedWeekRanges = [];
}
