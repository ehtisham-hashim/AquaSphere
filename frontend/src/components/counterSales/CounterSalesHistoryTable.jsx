import { Search, Calendar, Loader2, Printer, Trash2, ShieldAlert, User, CheckCircle, Eye } from 'lucide-react';

const getPaymentBadge = (cash, credit) => {
  if (credit > 0 && cash > 0) {
    return { label: '🔵 Partial Cash', style: 'bg-sky-100 text-sky-800 border border-sky-200 font-bold' };
  } else if (credit > 0) {
    return { label: '🔴 Full Credit', style: 'bg-purple-100 text-purple-800 border border-purple-200 font-bold' };
  } else {
    return { label: '🟢 Paid Cash', style: 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold' };
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

const formatItemSummary = (productTypeStr, productQty) => {
  if (!productTypeStr) return { mainItem: 'Retail Sale', extraCount: 0 };

  if (productTypeStr.includes('(') || productTypeStr.includes(',')) {
    const parts = productTypeStr.split(',').map(p => p.trim());
    const firstPart = parts[0];
    const match = firstPart.match(/^([A-Z0-9_]+)\s*\((x\d+)\)$/);
    let mainLabel = firstPart;
    if (match) {
      mainLabel = `${nameMap[match[1]] || match[1]} ${match[2]}`;
    }
    return {
      mainItem: mainLabel,
      extraCount: parts.length - 1
    };
  }

  const label = nameMap[productTypeStr] || productTypeStr;
  return {
    mainItem: `${label} × ${productQty || 1}`,
    extraCount: 0
  };
};

export default function CounterSalesHistoryTable({
  search,
  setSearch,
  loading,
  filteredSales,
  isDateClosed,
  isOwner,
  onPrintReceipt,
  onDeleteSale,
  userName
}) {
  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
        <input 
          type="search" 
          placeholder="Search by sale ID, product items, customer name, or remarks..." 
          className="input-base pl-10 text-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-container">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead>
            <tr>
              <th className="table-th">Sale & Date</th>
              <th className="table-th">Customer</th>
              <th className="table-th">Items Sold</th>
              <th className="table-th">Financials (Paid / Credit)</th>
              <th className="table-th">Payment Status</th>
              <th className="table-th">Operator</th>
              <th className="table-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="7" className="p-10 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand" />
                  Loading counter sales history...
                </td>
              </tr>
            ) : filteredSales.map(sale => {
              const cash = Number(sale.cashCollected || 0);
              const credit = Number(sale.creditAmount || 0);
              const total = cash + credit;
              const dailyClosed = isDateClosed(sale.createdAt);
              const pBadge = getPaymentBadge(cash, credit);
              const { mainItem, extraCount } = formatItemSummary(sale.productType, sale.productQty);

              return (
                <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Sale & Date */}
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-brand text-xs bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-md">
                        #{sale.saleNumber || sale.id.substring(0, 8)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-1 flex items-center gap-1 font-mono">
                      <Calendar size={12} className="text-slate-400" />
                      {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="table-td">
                    {sale.customer ? (
                      <div>
                        <div className="font-semibold text-slate-800 text-xs">{sale.customer.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{sale.customer.phone}</div>
                      </div>
                    ) : (
                      <div className="text-slate-400 font-medium flex items-center gap-1">
                        <User size={13} /> Walk-In Cash Customer
                      </div>
                    )}
                  </td>

                    {/* Compact Items Sold (1 item + compact badge for extra) */}
                  <td className="table-td whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg text-xs">
                        {mainItem}
                      </span>
                      {extraCount > 0 && (
                        <button
                          type="button"
                          onClick={() => onPrintReceipt(sale)}
                          title="Click to view all items"
                          className="text-[10px] font-bold text-brand bg-brand/10 hover:bg-brand/20 border border-brand/20 px-1.5 py-0.5 rounded-full transition"
                        >
                          +{extraCount} extra
                        </button>
                      )}
                    </div>
                    {sale.remarks && (
                      <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[200px]">
                        Note: {sale.remarks}
                      </span>
                    )}
                  </td>

                  {/* Financials (Received vs Credit) */}
                  <td className="table-td whitespace-nowrap">
                    <div className="font-mono font-bold text-slate-900 text-xs">Rs. {total.toLocaleString()}</div>
                    <div className="flex items-center gap-2 text-[11px] mt-0.5 font-mono">
                      <span className="text-emerald-700 font-semibold">Rec: Rs. {cash.toLocaleString()}</span>
                      {credit > 0 && (
                        <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          Credit: Rs. {credit.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Payment Status Pill */}
                  <td className="table-td whitespace-nowrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${pBadge.style}`}>
                      {pBadge.label}
                    </span>
                  </td>

                  {/* Operator */}
                  <td className="table-td text-slate-600 font-medium text-xs">
                    {sale.createdBy?.name || userName || 'System'}
                    <span className="text-[10px] text-slate-400 block font-normal">
                      ({sale.createdBy?.role || 'MM'})
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="table-td text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View Sale Details Button */}
                      <button
                        onClick={() => onPrintReceipt(sale)}
                        title="View Sale Details"
                        className="btn-outline text-[11px] py-1 px-2"
                      >
                        <Eye size={13} /> View
                      </button>

                      <button
                        onClick={() => onPrintReceipt(sale)}
                        title="Print Receipt"
                        className="btn-outline text-indigo-700 hover:text-indigo-800 text-[11px] py-1 px-2"
                      >
                        <Printer size={13} />
                      </button>

                      {isOwner && (
                        <button
                          onClick={() => onDeleteSale(sale)}
                          title="Delete Record (Owner Only)"
                          className="btn-danger text-[11px] py-1 px-2"
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
            })}

              {!loading && filteredSales.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-10 text-center text-slate-400 font-medium">
                    <CheckCircle size={28} className="mx-auto mb-2 opacity-30 text-slate-400" />
                    No counter sales history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
  );
}
