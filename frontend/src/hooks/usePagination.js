import { useState, useMemo, useEffect } from 'react';

/**
 * Standard table pagination hook.
 * Supports dynamic rows-per-page selection and safe auto-clamping.
 * Only resets to page 1 when resetTrigger (e.g. search/tab filter) changes,
 * preventing background SSE updates from resetting user page position.
 *
 * @param {Array} items - Full list of filtered items
 * @param {number} [initialPageSize=50] - Initial number of items per page
 * @param {any} [resetTrigger=null] - Optional dependency (e.g. search string) to trigger page reset
 */
export function usePagination(items = [], initialPageSize = 50, resetTrigger = null) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize || 50);

  useEffect(() => {
    if (initialPageSize) {
      setPageSize(initialPageSize);
    }
  }, [initialPageSize]);

  const totalItems = Array.isArray(items) ? items.length : 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Auto-reset to page 1 ONLY on external filter/search trigger change
  useEffect(() => {
    setCurrentPage(1);
  }, [resetTrigger]);

  // Safe auto-clamp if items shrink or totalPages decreases
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Ensure current page is within valid range during render
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, totalItems);

  const goToPage = (page) => {
    const target = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(target);
  };

  const nextPage = () => goToPage(safePage + 1);
  const prevPage = () => goToPage(safePage - 1);

  return {
    currentPage: safePage,
    setCurrentPage,
    totalPages,
    totalItems,
    pageSize,
    setPageSize,
    paginatedItems,
    currentItems: paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    startIndex,
    endIndex
  };
}

export default usePagination;
