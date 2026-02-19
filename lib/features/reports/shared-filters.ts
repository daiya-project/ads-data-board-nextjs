/**
 * Reports shared filter functions (Daily & Weekly common)
 * Pure functions for filtering report data by search terms.
 */

/**
 * Apply search filter with comma-separated multi-term search.
 * Filters items where search text includes ANY of the provided terms (OR logic).
 *
 * @param items - Array of items to filter
 * @param searchValue - Search string (supports comma-separated terms)
 * @param getSearchText - Function to extract searchable text from each item
 * @returns Filtered array
 *
 * @example
 * ```ts
 * const clients = [
 *   { client_id: "001", client_name: "ABC Corp" },
 *   { client_id: "002", client_name: "XYZ Ltd" },
 * ];
 * const filtered = applySearchFilter(
 *   clients,
 *   "001, xyz",
 *   (c) => `${c.client_id} ${c.client_name}`
 * );
 * // Returns both items (001 matches "001", XYZ Ltd matches "xyz")
 * ```
 */
export function applySearchFilter<T>(
  items: T[],
  searchValue: string,
  getSearchText: (item: T) => string
): T[] {
  const trimmed = searchValue?.trim() ?? "";
  if (!trimmed) return items;

  const terms = trimmed
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);

  if (terms.length === 0) return items;

  return items.filter((item) => {
    const searchText = getSearchText(item).toLowerCase();
    return terms.some((term) => searchText.includes(term));
  });
}
