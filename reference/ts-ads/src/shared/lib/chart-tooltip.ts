/**
 * Chart Utils - 글래스 툴팁 (CSS Grid Layout)
 */

import type { TooltipRow } from './chart-utils-types';

export function getOrCreateTooltipEl(canvasId: string): HTMLDivElement {
  const tooltipId = `tooltip-${canvasId}`;
  let el = document.getElementById(tooltipId) as HTMLDivElement | null;
  if (!el) {
    el = document.createElement('div');
    el.id = tooltipId;
    el.className = 'chart-glass-tooltip';
    document.body.appendChild(el);
  }
  return el;
}

export function buildGridTooltipHTML(rows: TooltipRow[]): string {
  if (rows.length === 0) return '';
  let html = '<div class="cgt-grid">';
  for (const row of rows) {
    html += `<span class="cgt-dot" style="background:${row.color}"></span>`;
    html += `<span class="cgt-label">${row.label}</span>`;
    html += `<span class="cgt-value">${row.value}</span>`;
  }
  html += '</div>';
  return html;
}

export function positionTooltip(
  el: HTMLDivElement,
  canvas: HTMLCanvasElement,
  caretX: number,
  caretY: number
): void {
  const rect = canvas.getBoundingClientRect();
  let left = rect.left + window.scrollX + caretX;
  const top = rect.top + window.scrollY + caretY - el.offsetHeight - 14;

  const tooltipWidth = el.offsetWidth;
  if (left + tooltipWidth / 2 > window.innerWidth) {
    left = window.innerWidth - tooltipWidth - 8;
  }
  if (left - tooltipWidth / 2 < 0) {
    left = tooltipWidth / 2 + 8;
  }

  el.style.left = left + 'px';
  el.style.top = top + 'px';
  el.style.transform = 'translateX(-50%)';
}
