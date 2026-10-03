import { useState, useMemo, useEffect } from 'react';

/**
 * Standard table pagination hook.
 * Defaults to 50 rows per page limit.
 * Automatically resets to page 1 whenever items length changes or external search/filter triggers.
 *
 * @param {Array} items - Full list of filtered items
 * @param {number} [pageSize=50] - Number of items per page
 * @param {any} [resetTrigger] - Optional dependency (e.g. search string) to trigger page reset
 */
export function usePagination(items = [], pageSize = 50, resetTrigger = null) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalItems = Array.isArray(items) ? items.length : 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Auto-reset to page 1 on items length change or external trigger
  useEffect(() => {
    setCurrentPage(1);
  }, [totalItems, resetTrigger]);

  // Ensure current page is valid if items shrink
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, totalItems);

  return {
    currentPage: safePage,
    setCurrentPage,
    totalPages,
    totalItems,
    pageSize,
    paginatedItems,
    startIndex,
    endIndex
  };
}

export default usePagination;
