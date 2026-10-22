import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function TablePagination({
  pagination,
  currentPage: propCurrentPage,
  totalPages: propTotalPages,
  totalItems: propTotalItems,
  pageSize: propPageSize = 50,
  onPageChange: propOnPageChange,
  onPageSizeChange: propOnPageSizeChange,
  startIndex: propStartIndex,
  endIndex: propEndIndex,
  className = ''
}) {
  const currentPage = pagination ? pagination.currentPage : (propCurrentPage || 1);
  const totalPages = pagination ? pagination.totalPages : (propTotalPages || 1);
  const totalItems = pagination ? pagination.totalItems : (propTotalItems || 0);
  const pageSize = pagination ? pagination.pageSize : propPageSize;
  const onPageChange = pagination ? (pagination.goToPage || pagination.setCurrentPage) : (propOnPageChange || (() => {}));
  const onPageSizeChange = pagination ? pagination.setPageSize : (propOnPageSizeChange || (() => {}));

  const startIndex = pagination
    ? pagination.startIndex
    : (propStartIndex !== undefined ? propStartIndex : (totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1));

  const endIndex = pagination
    ? pagination.endIndex
    : (propEndIndex !== undefined ? propEndIndex : Math.min(currentPage * pageSize, totalItems));

  if (totalItems <= 0) return null;

  // Generate visible page numbers (maximum 5 page buttons around current page)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/60 text-xs text-slate-600 rounded-b-xl ${className}`}>
      {/* Range Counter & Rows Per Page Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium text-slate-500">
          Showing <span className="font-bold text-slate-800 font-mono">{startIndex}-{endIndex}</span> of{' '}
          <span className="font-bold text-slate-800 font-mono">{totalItems}</span> records
        </span>
        <div className="flex items-center gap-1.5 ml-1">
          <label htmlFor="table-page-size-select" className="text-slate-400 text-[11px]">Rows:</label>
          <select
            id="table-page-size-select"
            value={pageSize}
            onChange={(e) => onPageSizeChange && onPageSizeChange(Number(e.target.value))}
            className="text-[11px] font-bold bg-white text-slate-700 border border-slate-300 rounded-lg px-2 py-0.5 focus:ring-1 focus:ring-brand focus:border-brand shadow-2xs cursor-pointer outline-none"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>
      </div>

      {/* Pagination Controls - Always Rendered */}
      <div className="flex items-center gap-1.5">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition shadow-2xs"
          title="First page"
        >
          <ChevronsLeft size={14} />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition shadow-2xs"
          title="Previous page"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Page Pills */}
        <div className="flex items-center gap-1">
          {pageNumbers[0] > 1 && (
            <>
              <button
                type="button"
                onClick={() => onPageChange(1)}
                className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-semibold text-xs font-mono transition"
              >
                1
              </button>
              {pageNumbers[0] > 2 && <span className="px-0.5 text-slate-400 font-bold">…</span>}
            </>
          )}

          {pageNumbers.map(pageNum => (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition shadow-2xs ${
                currentPage === pageNum
                  ? 'bg-brand text-white border border-brand'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {pageNum}
            </button>
          ))}

          {pageNumbers[pageNumbers.length - 1] < totalPages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                <span className="px-0.5 text-slate-400 font-bold">…</span>
              )}
              <button
                type="button"
                onClick={() => onPageChange(totalPages)}
                className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-semibold text-xs font-mono transition"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition shadow-2xs"
          title="Next page"
        >
          <ChevronRight size={14} />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition shadow-2xs"
          title="Last page"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
}
