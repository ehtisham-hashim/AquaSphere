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
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
        <input 
          type="search" 
          placeholder="Search by sale ID, product items, customer name, or remarks..." 
          className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all shadow-2xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Sale & Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items Sold</th>
                <th className="px-4 py-3">Financials (Paid / Credit)</th>
                <th className="px-4 py-3">Payment Status</th>
                <th className="px-4 py-3">Operator</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
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
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    {/* Sale & Date */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-emerald-800 text-xs bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          #{sale.saleNumber || sale.id.substring(0, 8)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3">
                      {sale.customer ? (
                        <div>
                          <div className="font-bold text-slate-800 text-xs">{sale.customer.name}</div>
                          <div className="text-[11px] text-slate-400">{sale.customer.phone}</div>
                        </div>
                      ) : (
                        <div className="text-slate-400 font-medium flex items-center gap-1">
                          <User size={13} /> Walk-In Cash Customer
                        </div>
                      )}
                    </td>

                    {/* Compact Items Sold (1 item + compact badge for extra) */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg text-xs">
                          {mainItem}
                        </span>
                        {extraCount > 0 && (
                          <button
                            type="button"
                            onClick={() => onPrintReceipt(sale)}
                            title="Click to view all items"
                            className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-full transition"
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
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-black text-slate-900 text-sm">Rs. {total.toLocaleString()}</div>
                      <div className="flex items-center gap-2 text-[11px] mt-0.5">
                        <span className="text-emerald-700 font-bold">Rec: Rs. {cash.toLocaleString()}</span>
                        {credit > 0 && (
                          <span className="text-purple-700 font-extrabold bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                            Credit: Rs. {credit.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Payment Status Pill */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${pBadge.style}`}>
                        {pBadge.label}
                      </span>
                    </td>

                    {/* Operator */}
                    <td className="px-4 py-3 text-slate-600 font-medium text-xs">
                      {sale.createdBy?.name || userName || 'System'}
                      <span className="text-[10px] text-slate-400 block font-normal">
                        ({sale.createdBy?.role || 'MM'})
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Sale Details Button */}
                        <button
                          onClick={() => onPrintReceipt(sale)}
                          title="View Sale Details"
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition flex items-center gap-1 text-[11px] font-bold px-2"
                        >
                          <Eye size={13} /> View
                        </button>

                        <button
                          onClick={() => onPrintReceipt(sale)}
                          title="Print Receipt"
                          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition"
                        >
                          <Printer size={14} />
                        </button>

                        {isOwner && (
                          <button
                            onClick={() => onDeleteSale(sale)}
                            title="Delete Record (Owner Only)"
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200 transition"
                          >
                            <Trash2 size={14} />
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
    </div>
  );
}
