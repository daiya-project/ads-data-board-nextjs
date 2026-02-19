/**
 * Summary Statistic Cards - Clean Glassmorphism Design
 * 한국 금융 표준 색상 체계 적용:
 * - 상승/신규/긍정: 빨강 (Red)
 * - 하락/중단/부정: 파랑 (Blue)
 * - 중립/정보: 인디고 (Indigo)
 */

import { formatNumberWithCommas } from '@shared/lib';

// ============================================================================
// Types
// ============================================================================

/** 카드 테마 (한국 금융 표준) */
export type CardTheme = 'positive' | 'negative' | 'neutral';

/** 아이콘 타입 */
export type IconType = 
  | 'users' 
  | 'sparkles' 
  | 'trending-up' 
  | 'trending-down' 
  | 'chart' 
  | 'target'
  | 'calendar'
  | 'lightning';

/** Summary Stat Card 데이터 */
export interface SummaryStatCardData {
  /** 카드 ID */
  id: string;
  /** 카드 테마 */
  theme: CardTheme;
  /** 아이콘 타입 */
  icon: IconType;
  /** 타이틀 (영문 대문자 권장) */
  title: string;
  /** 메인 데이터 (숫자 또는 텍스트) */
  mainValue: string | number;
  /** 메인 데이터 서픽스 (예: 원, %, 건) */
  mainSuffix?: string;
  /** 서브 데이터 (선택) */
  subValue?: string;
  /** 서브 데이터 레이블 (선택) */
  subLabel?: string;
  /** 변화 표시 (예: "→", "▲", "▼") */
  changeIndicator?: string;
  /** 변화 전 값 (선택) */
  previousValue?: string | number;
}

/** 카드 그리드 옵션 */
export interface SummaryStatGridOptions {
  /** 컬럼 수 (기본: 자동) */
  columns?: 2 | 3 | 4 | 5;
  /** 갭 크기 (기본: 20px) */
  gap?: number;
  /** 컨테이너 클래스명 추가 */
  className?: string;
}

// ============================================================================
// Icon SVGs (Duotone Style)
// ============================================================================

const ICONS: Record<IconType, string> = {
  users: `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="4" fill="currentColor" opacity="0.3"/>
      <path d="M12 14c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4z" fill="currentColor"/>
    </svg>
  `,
  sparkles: `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L13.09 8.26L18 6L15.74 10.91L22 12L15.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L8.26 13.09L2 12L8.26 10.91L6 6L10.91 8.26L12 2Z" fill="currentColor" opacity="0.3"/>
      <path d="M12 6L12.72 9.28L16 10L12.72 10.72L12 14L11.28 10.72L8 10L11.28 9.28L12 6Z" fill="currentColor"/>
    </svg>
  `,
  'trending-up': `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 20L9 13L13 17L22 8" stroke="currentColor" opacity="0.3" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 8H22V14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M2 20L9 13L13 17L22 8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  'trending-down': `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 4L9 11L13 7L22 16" stroke="currentColor" opacity="0.3" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 16H22V10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M2 4L9 11L13 7L22 16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  chart: `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="12" width="4" height="9" rx="1" fill="currentColor" opacity="0.3"/>
      <rect x="10" y="8" width="4" height="13" rx="1" fill="currentColor" opacity="0.5"/>
      <rect x="17" y="4" width="4" height="17" rx="1" fill="currentColor"/>
    </svg>
  `,
  target: `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" opacity="0.3" stroke-width="2"/>
      <circle cx="12" cy="12" r="6" stroke="currentColor" opacity="0.5" stroke-width="2"/>
      <circle cx="12" cy="12" r="2" fill="currentColor"/>
    </svg>
  `,
  calendar: `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="18" height="18" rx="2" fill="currentColor" opacity="0.3"/>
      <path d="M3 10H21" stroke="currentColor" stroke-width="2"/>
      <path d="M8 2V6M16 2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <rect x="7" y="14" width="4" height="4" rx="1" fill="currentColor"/>
    </svg>
  `,
  lightning: `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2L4 14H11L10 22L20 10H13L13 2Z" fill="currentColor" opacity="0.3"/>
      <path d="M13 2L4 14H11L10 22L20 10H13L13 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    </svg>
  `
};

// ============================================================================
// Theme Colors (Korean Finance Standard)
// ============================================================================

const THEME_COLORS: Record<CardTheme, { icon: string; accent: string; bg: string }> = {
  positive: {
    icon: '#dc2626',      // Red-600: 상승/신규
    accent: '#dc2626',
    bg: 'rgba(254, 242, 242, 0.5)'  // Red-50 with opacity
  },
  negative: {
    icon: '#2563eb',      // Blue-600: 하락/중단
    accent: '#2563eb',
    bg: 'rgba(239, 246, 255, 0.5)'  // Blue-50 with opacity
  },
  neutral: {
    icon: '#4f46e5',      // Indigo-600: 중립/정보
    accent: '#1e1b4b',    // Indigo-950
    bg: 'rgba(238, 242, 255, 0.5)'  // Indigo-50 with opacity
  }
};

// ============================================================================
// Render Functions
// ============================================================================

/**
 * 단일 Summary Stat Card 렌더링
 */
export function renderSummaryStatCard(data: SummaryStatCardData): HTMLElement {
  const card = document.createElement('div');
  card.className = 'summary-stat-card';
  card.setAttribute('data-card-id', data.id);
  card.setAttribute('data-theme', data.theme);

  const colors = THEME_COLORS[data.theme];
  const iconSvg = ICONS[data.icon] || ICONS.chart;

  // 메인 값 포맷팅
  const formattedMain = typeof data.mainValue === 'number' 
    ? formatNumberWithCommas(data.mainValue) 
    : data.mainValue;

  // 이전 값 포맷팅 (있는 경우)
  const formattedPrevious = data.previousValue !== undefined
    ? (typeof data.previousValue === 'number' 
        ? formatNumberWithCommas(data.previousValue) 
        : data.previousValue)
    : null;

  card.innerHTML = `
    <div class="summary-stat-card__icon" style="color: ${colors.icon}">
      ${iconSvg}
    </div>
    <div class="summary-stat-card__content">
      <span class="summary-stat-card__title">${data.title}</span>
      <div class="summary-stat-card__main">
        ${formattedPrevious !== null ? `
          <span class="summary-stat-card__previous">${formattedPrevious}</span>
          <span class="summary-stat-card__indicator">${data.changeIndicator || '→'}</span>
        ` : ''}
        <span class="summary-stat-card__value" style="color: ${colors.accent}">${formattedMain}</span>
        ${data.mainSuffix ? `<span class="summary-stat-card__suffix">${data.mainSuffix}</span>` : ''}
      </div>
      ${data.subValue ? `
        <div class="summary-stat-card__sub">
          <span class="summary-stat-card__sub-value">${data.subValue}</span>
          ${data.subLabel ? `<span class="summary-stat-card__sub-label">${data.subLabel}</span>` : ''}
        </div>
      ` : ''}
    </div>
  `;

  return card;
}

/**
 * Summary Stat Card 그리드 렌더링
 */
export function renderSummaryStatGrid(
  container: HTMLElement,
  cards: SummaryStatCardData[],
  options: SummaryStatGridOptions = {}
): void {
  const { columns, gap = 20, className = '' } = options;

  // 그리드 컨테이너 생성
  const grid = document.createElement('div');
  grid.className = `summary-stat-grid ${className}`.trim();
  
  if (columns) {
    grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
  }
  grid.style.gap = `${gap}px`;

  // 카드들 추가
  cards.forEach(cardData => {
    const card = renderSummaryStatCard(cardData);
    grid.appendChild(card);
  });

  // 컨테이너에 추가
  container.innerHTML = '';
  container.appendChild(grid);
}

/**
 * Summary Stat Card HTML 문자열 반환 (innerHTML 용)
 */
export function getSummaryStatCardHTML(data: SummaryStatCardData): string {
  const colors = THEME_COLORS[data.theme];
  const iconSvg = ICONS[data.icon] || ICONS.chart;

  const formattedMain = typeof data.mainValue === 'number' 
    ? formatNumberWithCommas(data.mainValue) 
    : data.mainValue;

  const formattedPrevious = data.previousValue !== undefined
    ? (typeof data.previousValue === 'number' 
        ? formatNumberWithCommas(data.previousValue) 
        : data.previousValue)
    : null;

  return `
    <div class="summary-stat-card" data-card-id="${data.id}" data-theme="${data.theme}">
      <div class="summary-stat-card__icon" style="color: ${colors.icon}">
        ${iconSvg}
      </div>
      <div class="summary-stat-card__content">
        <span class="summary-stat-card__title">${data.title}</span>
        <div class="summary-stat-card__main">
          ${formattedPrevious !== null ? `
            <span class="summary-stat-card__previous">${formattedPrevious}</span>
            <span class="summary-stat-card__indicator">${data.changeIndicator || '→'}</span>
          ` : ''}
          <span class="summary-stat-card__value" style="color: ${colors.accent}">${formattedMain}</span>
          ${data.mainSuffix ? `<span class="summary-stat-card__suffix">${data.mainSuffix}</span>` : ''}
        </div>
        ${data.subValue ? `
          <div class="summary-stat-card__sub">
            <span class="summary-stat-card__sub-value">${data.subValue}</span>
            ${data.subLabel ? `<span class="summary-stat-card__sub-label">${data.subLabel}</span>` : ''}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * 그리드 전체 HTML 문자열 반환
 */
export function getSummaryStatGridHTML(
  cards: SummaryStatCardData[],
  options: SummaryStatGridOptions = {}
): string {
  const { columns, gap = 20, className = '' } = options;
  
  const gridStyle = columns 
    ? `grid-template-columns: repeat(${columns}, 1fr); gap: ${gap}px;`
    : `gap: ${gap}px;`;

  const cardsHTML = cards.map(getSummaryStatCardHTML).join('');

  return `
    <div class="summary-stat-grid ${className}" style="${gridStyle}">
      ${cardsHTML}
    </div>
  `;
}

// ============================================================================
// Example Data Factory
// ============================================================================

/**
 * 예시 데이터 생성 (데모용)
 */
export function createExampleCards(): SummaryStatCardData[] {
  return [
    {
      id: 'active-clients',
      theme: 'neutral',
      icon: 'users',
      title: 'ACTIVE CLIENTS',
      mainValue: 93,
      previousValue: 96,
      changeIndicator: '→'
    },
    {
      id: 'new-clients',
      theme: 'positive',
      icon: 'sparkles',
      title: 'NEW CLIENTS',
      mainValue: 196645,
      subValue: '5',
      subLabel: 'count'
    },
    {
      id: 'revenue-up',
      theme: 'positive',
      icon: 'trending-up',
      title: 'REVENUE UP',
      mainValue: 2450000,
      mainSuffix: '원',
      subValue: '+12.5%',
      subLabel: 'vs last week'
    },
    {
      id: 'revenue-down',
      theme: 'negative',
      icon: 'trending-down',
      title: 'REVENUE DOWN',
      mainValue: 850000,
      mainSuffix: '원',
      subValue: '-3.2%',
      subLabel: 'vs last week'
    },
    {
      id: 'stopped-clients',
      theme: 'negative',
      icon: 'calendar',
      title: 'STOPPED',
      mainValue: 8,
      subValue: '3',
      subLabel: 'this week'
    }
  ];
}
