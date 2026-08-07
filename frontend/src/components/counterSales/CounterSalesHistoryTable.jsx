import { Search, Calendar, Loader2, Printer, Trash2, ShieldAlert } from 'lucide-react';

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
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
        <input 
          type="search" 
          placeholder="Search by sale number, product, customer name, or remarks..." 
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="p-4">Sale ID</th>
                <th className="p-4">Product Type</th>
                <th className="p-4">Date & Time</th>
                <th className="p-4">Litres (L)</th>
                <th className="p-4">Cash</th>
                <th className="p-4">Credit</th>
                <th className="p-4">Total Amount</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Recorded By</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="10" className="p-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading counter sales history...
                  </td>
                </tr>
              ) : filteredSales.map(sale => {
                const cash = Number(sale.cashCollected || 0);
                const credit = Number(sale.creditAmount || 0);
                const total = cash + credit;
                const dailyClosed = isDateClosed(sale.createdAt);

                return (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-mono font-black text-emerald-800 text-xs">
                      {sale.saleNumber || sale.id.substring(0, 8)}
                    </td>
                    <td className="p-4">
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md text-xs font-bold">
                        {sale.productType || 'CUSTOM'} x {sale.productQty || 1}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400"/>
                        {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </td>
                    <td className="p-4 text-blue-900 font-extrabold">{sale.litresSold} L</td>
                    <td className="p-4 text-emerald-700 font-bold">Rs. {cash.toLocaleString()}</td>
                    <td className="p-4 text-purple-900 font-bold">Rs. {credit.toLocaleString()}</td>
                    <td className="p-4 text-slate-900 font-black">Rs. {total.toLocaleString()}</td>
                    <td className="p-4 text-xs font-semibold text-slate-800">
                      {sale.customer ? (
                        <span className="text-purple-800 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full">
                          {sale.customer.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">Walk-In Cash</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-slate-600 font-medium">
                      {sale.createdBy?.name || userName || 'System'} ({sale.createdBy?.role || 'MM'})
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onPrintReceipt(sale)}
                          title="Print Receipt"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        >
                          <Printer size={15} />
                        </button>

                        {isOwner && (
                          <button
                            onClick={() => onDeleteSale(sale)}
                            title="Delete Record (Owner Only)"
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}

                        {dailyClosed && (
                          <span title="Daily Close Locked" className="text-amber-600">
                            <ShieldAlert size={15} />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && filteredSales.length === 0 && (
                <tr>
                  <td colSpan="10" className="p-10 text-center text-slate-400 text-sm">No counter sales history found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
