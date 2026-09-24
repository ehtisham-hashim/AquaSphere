import { useState, useEffect } from 'react';
import { 
  Search, 
  Calendar, 
  Trash2, 
  ShieldAlert, 
  User, 
  ShoppingBag, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight 
} from 'lucide-react';

const getPaymentBadge = (cash, credit) => {
  if (credit > 0 && cash > 0) {
    return (
      <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">
        Partial
      </span>
    );
  } else if (credit > 0) {
    return (
      <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">
        Credit
      </span>
    );
  } else {
    return (
      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">
        Cash
      </span>
    );
  }
};

const nameMap = {
  'PACK_05L': '0.5L Full Pack',
  'SINGLE_05L': '0.5L Single Bottle',
  'PACK_15L': '1.5L Full Pack',
  'SINGLE_15L': '1.5L Single Bottle',
  'BOTTLE_19L': '19L Bottle Refill',
  'CUSTOM': 'Custom Water'
};

const getSaleProducts = (sale) => {
  if (Array.isArray(sale.items) && sale.items.length > 0) {
    return sale.items.map(it => ({
      name: it.item?.name || 'Item',
      qty: Number(it.quantity || 1)
    }));
  }

  const str = sale.productType;
  if (!str) {
    return [{ name: 'Retail Sale', qty: Number(sale.productQty || 1) }];
  }

  if (str.includes('(') || str.includes(',')) {
    const parts = str.split(',').map(p => p.trim()).filter(Boolean);
    return parts.map(part => {
      const match = part.match(/^([A-Z0-9_]+)\s*\((?:x|×)?(\d+)\)$/);
      if (match) {
        return {
          name: nameMap[match[1]] || match[1],
          qty: Number(match[2])
        };
      }
      return {
        name: nameMap[part] || part,
        qty: 1
      };
    });
  }

  return [{
    name: nameMap[str] || str,
    qty: Number(sale.productQty || 1)
  }];
};

export default function CounterSalesHistoryTable({
  search,
  setSearch,
  loading,
  filteredSales,
  isDateClosed,
  isOwner,
  onPrintReceipt,
  onDeleteSale
}) {
  // Strict Pagination: default 50, options 50, 100, 500
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever search or pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredSales.length);
  const paginatedSales = filteredSales.slice(startIndex, endIndex);

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
        <input 
          type="search" 
          placeholder="Search by sale ID, items, customer, or cashier..." 
          className="input-base pl-10 text-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr>
                <th className="table-th">Sale Details</th>
                <th className="table-th">Customer</th>
                <th className="table-th">Items Sold</th>
                <th className="table-th">Total & Paid</th>
                <th className="table-th">Payment</th>
                <th className="table-th">Cashier</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="table-td">
                      <div className="h-4 bg-slate-200 rounded w-20 mb-1"></div>
                      <div className="h-3 bg-slate-200 rounded w-28"></div>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 shrink-0"></div>
                        <div className="space-y-1">
                          <div className="h-3 bg-slate-200 rounded w-24"></div>
                          <div className="h-2.5 bg-slate-200 rounded w-16"></div>
                        </div>
                      </div>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1.5">
                        <div className="h-5 bg-slate-200 rounded-md w-28"></div>
                        <div className="h-5 bg-slate-200 rounded-md w-24"></div>
                      </div>
                    </td>
                    <td className="table-td">
                      <div className="h-4 bg-slate-200 rounded w-20 mb-1"></div>
                      <div className="h-3 bg-slate-200 rounded w-16"></div>
                    </td>
                    <td className="table-td">
                      <div className="h-5 bg-slate-200 rounded-full w-14"></div>
                    </td>
                    <td className="table-td">
                      <div className="h-3.5 bg-slate-200 rounded w-16 mb-1"></div>
                      <div className="h-2.5 bg-slate-200 rounded w-10"></div>
                    </td>
                    <td className="table-td text-right">
                      <div className="h-6 bg-slate-200 rounded w-16 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-500">
                    <div className="max-w-md mx-auto flex flex-col items-center">
                      <div className="p-3 rounded-full bg-brand/10 text-brand mb-2">
                        <ShoppingBag size={24} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">No Counter Sales Found</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {search ? 'No sales match your search query.' : 'No counter sales recorded yet. Log a sale above to get started.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedSales.map(sale => {
                  const total = Number(sale.totalAmount ?? (Number(sale.cashCollected || 0) + Number(sale.creditAmount || 0)));
                  const paid = Number(sale.amountPaid ?? Number(sale.cashCollected || 0));
                  const debt = Number(sale.debtAmount ?? Number(sale.creditAmount || 0));
                  const dailyClosed = isDateClosed(sale.createdAt);

                  // Products breakdown (show up to 2 items + remaining count badge)
                  const products = getSaleProducts(sale);
                  const visibleProducts = products.slice(0, 2);
                  const remainingCount = products.length - 2;

                  const saleNum = sale.saleNumber || (sale.id ? sale.id.substring(0, 8).toUpperCase() : 'SALE');

                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors text-xs">
                      {/* Sale ID & Timestamp */}
                      <td className="table-td">
                        <span className="font-mono font-bold text-xs text-brand block">
                          #{saleNum}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono mt-0.5">
                          <Calendar size={11} className="text-slate-400 shrink-0" />
                          {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center shrink-0">
                            <User size={13} />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 text-xs">
                              {sale.customer?.name || 'Walk-In Customer'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {sale.customer?.phone || 'Counter Cash'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Items Sold */}
                      <td className="table-td">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {visibleProducts.map((p, idx) => (
                            <span 
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border bg-slate-50 border-slate-200 text-slate-800"
                            >
                              <span className="font-semibold text-slate-700">{p.name}:</span>
                              <span className="font-bold text-slate-900 font-mono">×{p.qty}</span>
                            </span>
                          ))}
                          {remainingCount > 0 && (
                            <button
                              type="button"
                              onClick={() => onPrintReceipt(sale)}
                              title="Click to view all items on receipt"
                              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition border border-slate-200"
                            >
                              +{remainingCount} more
                            </button>
                          )}
                        </div>
                        {sale.remarks && (
                          <span className="text-[10px] text-slate-400 block mt-1 truncate max-w-[200px]">
                            {sale.remarks}
                          </span>
                        )}
                      </td>

                      {/* Total & Paid */}
                      <td className="table-td">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          ₨ {total.toLocaleString()}
                        </div>
                        {debt > 0 ? (
                          <div className="text-[10px] font-mono text-amber-700 font-semibold mt-0.5">
                            Paid: ₨ {paid.toLocaleString()} • Due: ₨ {debt.toLocaleString()}
                          </div>
                        ) : (
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            Paid in Full
                          </div>
                        )}
                      </td>

                      {/* Clean Payment Badge */}
                      <td className="table-td">
                        {getPaymentBadge(paid, debt)}
                      </td>

                      {/* Cashier / Operator */}
                      <td className="table-td">
                        <div className="font-semibold text-slate-800 text-xs">
                          {sale.createdBy?.name || 'Staff'}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                          {sale.createdBy?.role || 'POS'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="table-td text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onPrintReceipt(sale)}
                            className="btn-outline text-xs px-2.5 py-1 flex items-center gap-1.5"
                            title="View & Print Receipt"
                          >
                            <Eye size={13} />
                            <span>Receipt</span>
                          </button>

                          {isOwner && (
                            <button
                              onClick={() => onDeleteSale(sale)}
                              title="Delete Sale (Owner Only)"
                              className="p-1.5 rounded-lg border text-xs bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 transition"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}

                          {dailyClosed && (
                            <span title="Daily Close Locked" className="text-amber-600 p-1">
                              <ShieldAlert size={14} />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strict Pagination Controls Bar */}
      {!loading && filteredSales.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs shadow-2xs">
          <div className="flex flex-wrap items-center gap-3 text-slate-600">
            <span>
              Showing <strong className="text-slate-900 font-mono">{startIndex + 1}</strong> to{' '}
              <strong className="text-slate-900 font-mono">{endIndex}</strong> of{' '}
              <strong className="text-slate-900 font-mono">{filteredSales.length}</strong> sales
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="select-base py-0.5 px-2 text-xs font-semibold cursor-pointer w-auto"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium mr-1.5 font-mono text-[11px]">
              Page {validCurrentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={validCurrentPage <= 1}
              className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-slate-700 transition"
              title="First Page"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={validCurrentPage <= 1}
              className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-slate-700 transition"
              title="Previous Page"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage >= totalPages}
              className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-slate-700 transition"
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={validCurrentPage >= totalPages}
              className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-slate-700 transition"
              title="Last Page"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

