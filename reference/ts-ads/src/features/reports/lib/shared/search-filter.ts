/**
 * 텍스트 검색 필터 (쉼표 구분 다중 검색어)
 */

export function applySearchFilter<T>(
  clients: T[],
  searchValue: string,
  getSearchText: (item: T) => string
): T[] {
  const trimmed = searchValue?.trim() ?? '';
  if (!trimmed) return clients;
  const terms = trimmed
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
  if (terms.length === 0) return clients;
  return clients.filter((item) => {
    const searchText = getSearchText(item).toLowerCase();
    return terms.some((term) => searchText.includes(term));
  });
}
