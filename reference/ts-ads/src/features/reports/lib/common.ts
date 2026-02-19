/**
 * 리포트 공통 — 스켈레톤 UI
 */

import { getCachedElementById } from '@shared/lib';

export function showSkeletonLoading(
  tbody: HTMLElement,
  rowCount = 10,
  theadId = 'daily-report-thead'
): void {
  tbody.innerHTML = '';
  const thead = getCachedElementById(theadId);
  let headerCols = 18;
  if (thead) {
    const thElements = thead.querySelectorAll('th');
    headerCols = thElements.length;
  }
  for (let i = 0; i < rowCount; i++) {
    const row = document.createElement('tr');
    row.className = 'skeleton-row';
    for (let j = 0; j < headerCols; j++) {
      const td = document.createElement('td');
      const skeleton = document.createElement('div');
      skeleton.className = 'skeleton';
      if (j === 0) skeleton.style.width = '80px';
      else if (j === 1) skeleton.style.width = '150px';
      else if (j === 2 || j === 3) skeleton.style.width = '90px';
      else skeleton.style.width = '100px';
      td.appendChild(skeleton);
      row.appendChild(td);
    }
    tbody.appendChild(row);
  }
}
