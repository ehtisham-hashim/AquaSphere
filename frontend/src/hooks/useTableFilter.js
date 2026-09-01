import { useState, useMemo } from 'react';

/**
 * Hook for managing client-side table searching, filtering, sorting, and pagination.
 */
export function useTableFilter(items = [], options = {}) {
  const {
    searchKeys = [],
    initialLimit = 25,
    defaultSortKey = '',
    defaultSortOrder = 'desc',
    customFilter = null
  } = options;

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(initialLimit);
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortOrder, setSortOrder] = useState(defaultSortOrder);

  const filteredItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    let result = items;

    if (customFilter && typeof customFilter === 'function') {
      result = result.filter(customFilter);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(item => {
        if (!item) return false;
        if (searchKeys.length > 0) {
          return searchKeys.some(key => {
            const val = item[key];
            return val != null && String(val).toLowerCase().includes(q);
          });
        }
        return Object.values(item).some(val => val != null && String(val).toLowerCase().includes(q));
      });
    }

    if (sortKey) {
      result = [...result].sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (valA == null) return 1;
        if (valB == null) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        const strA = String(valA);
        const strB = String(valB);
        return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return result;
  }, [items, search, searchKeys, customFilter, sortKey, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / limit));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredItems.slice(start, start + limit);
  }, [filteredItems, currentPage, limit]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  return {
    search,
    setSearch: (val) => { setSearch(val); setPage(1); },
    page: currentPage,
    setPage,
    limit,
    setLimit: (val) => { setLimit(val); setPage(1); },
    sortKey,
    sortOrder,
    toggleSort,
    totalItems: filteredItems.length,
    totalPages,
    paginatedItems,
    filteredItems
  };
}
