/**
 * HTML 이스케이프 (XSS 방지)
 * innerHTML 등에 사용자/DB 입력을 넣을 때 사용
 */
export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return String(str).replace(/[&<>"']/g, (ch) => map[ch] ?? ch);
}
