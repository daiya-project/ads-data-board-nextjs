/**
 * Chart Utils - 공통 스타일 및 상수
 */

export const DATA_FONT = "'Roboto Mono', 'SF Mono', monospace";

export function commonTickStyle() {
  return {
    font: { family: DATA_FONT, size: 11 },
    color: '#9CA3AF',
  };
}

export function commonGridStyle() {
  return {
    color: 'rgba(226, 232, 240, 0.4)',
    drawBorder: false,
  };
}

export const COLOR_BLUE = '#4A90E2';
export const COLOR_BLUE_LIGHT = 'rgba(74, 144, 226, 0.5)';
export const COLOR_RED = '#EF4444';
export const COLOR_RED_LIGHT = 'rgba(239, 68, 68, 0.4)';
export const COLOR_BAR = 'rgba(74, 144, 226, 0.55)';
export const COLOR_BAR_BORDER = 'rgba(74, 144, 226, 0.8)';
