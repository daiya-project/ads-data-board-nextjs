/**
 * Manager Setting Table - 포맷 유틸
 */

export function formatCreatedAt(createdAt: string | null | undefined): string {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}. ${month}. ${day}.`;
}
