/**
 * 포맷팅 유틸리티 함수
 */

export function formatNumberWithCommas(num: number | string): string {
  if (num !== 0 && !num) return '';
  const roundedNum = Math.round(Number(num));
  return String(roundedNum).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function cleanClientName(clientName: string): string {
  if (!clientName) return '';
  let cleaned = clientName.replace(/\s*\/\s*Daily\s+Trend\s*$/i, '');
  cleaned = cleaned.replace(/^\d+\.\s*/, '');
  cleaned = cleaned.trim();
  return cleaned;
}

export function cleanClientNameShort(clientName: string): string {
  if (!clientName) return '';
  let cleaned = clientName.replace(/\s*\/\s*Daily\s+Trend\s*$/i, '');
  cleaned = cleaned.replace(/^\d+\.\s*/, '');
  cleaned = cleaned.replace(/\(([^)]+)\)/g, (_match, contentInsideParen: string) => {
    const hasAlphabet = /[a-zA-Z]/.test(contentInsideParen);
    return hasAlphabet ? '' : _match;
  });
  cleaned = cleaned.replace(/주식회사\s*/g, '');
  cleaned = cleaned.trim();
  if (cleaned.length > 5) {
    cleaned = cleaned.substring(0, 5) + '..';
  }
  return cleaned;
}

export function formatRevenueNumber(num: number | string): string {
  if (num !== 0 && !num) return '0';
  const numValue = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
  if (isNaN(numValue)) return '0';
  return formatNumberWithCommas(Math.round(numValue));
}

export function removeCommas(str: string): string {
  if (!str) return '';
  return String(str).replace(/,/g, '');
}
