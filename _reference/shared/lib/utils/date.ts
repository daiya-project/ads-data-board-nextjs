/**
 * 날짜 유틸리티 함수
 */

import type { DateFormat } from '@shared/types';

export function formatDate(
  date: Date | string | null | undefined,
  format: DateFormat = 'YYYY-MM-DD'
): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  const formatMap: Record<DateFormat, () => string> = {
    'YYYY-MM-DD': () => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
    'MM.DD.': () => {
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${month}. ${day}.`;
    },
    'YY.MM.DD': () => {
      const year = String(d.getFullYear()).slice(-2);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}. ${month}. ${day}`;
    },
  };

  const formatter = formatMap[format];
  return formatter ? formatter() : '';
}

export function formatDateDisplay(date: Date | string | null | undefined): string {
  return formatDate(date, 'MM.DD.');
}

export function formatDateForHeader(date: Date | string | null | undefined): string {
  return formatDate(date, 'YY.MM.DD');
}
