import { ArrowUpRight, ArrowDownRight, History, Package } from 'lucide-react';

export default function InventoryTransactionHistoryTable({ 
  transactions = [], 
  isLoading = false,
  tenant = 'aquasphere' 
}) {
  const isWadaana = tenant === 'wadaana';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <History className={`w-5 h-5 ${isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'}`} />
            Finished Goods Audit Ledger & Transaction Movement
          </h3>
          <p className="text-xs text-slate-500">Detailed record of stock entries (IN) and stock dispatches (OUT)</p>
        </div>
        <span className="text-xs font-semibold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
          Total Logs: {transactions.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-100/90 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="p-3.5">Date & Time</th>
              <th className="p-3.5">Finished Product</th>
              <th className="p-3.5">Movement Type</th>
              <th className="p-3.5">Quantity</th>
              <th className="p-3.5">Source / Reason</th>
              <th className="p-3.5">Ref ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan="6" className="p-12 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2 font-medium text-sm">
                    <div className={`w-5 h-5 border-2 ${isWadaana ? 'border-[#0ea5e9]' : 'border-emerald-600'} border-t-transparent rounded-full animate-spin`}></div>
                    Loading finished goods transactions...
                  </div>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-12 text-center text-slate-400">
                  <Package size={32} className="mx-auto mb-2 opacity-40" />
                  No finished goods inventory transactions recorded.
                </td>
              </tr>
            ) : (
              transactions.map(t => {
                const isIN = t.direction === 'IN';
                const qty = Number(t.quantity || 0);

                const getFinishedGoodUnit = (item) => {
                  if (!item) return 'packs';
                  const nameLower = (item.name || '').toLowerCase();
                  if (nameLower.includes('0.5') || nameLower.includes('500') || nameLower.includes('1.5') || nameLower.includes('1500')) {
                    return 'packs';
                  }
                  if (nameLower.includes('19')) {
                    return 'bottles';
                  }
                  return (item.unit && item.unit !== 'kg') ? item.unit : 'packs';
                };

                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5">
                      <span className="font-mono text-xs text-slate-700 font-bold">{new Date(t.createdAt).toLocaleDateString()}</span>
                      <span className="text-[11px] text-slate-400 block">{new Date(t.createdAt).toLocaleTimeString()}</span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">
                      {t.item?.name || 'Finished Product'}
                    </td>
                    <td className="p-3.5">
                      {isIN ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                          <ArrowUpRight size={13} /> INBOUND
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                          <ArrowDownRight size={13} /> OUTBOUND
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className={`font-mono font-bold text-base ${isIN ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isIN ? '+' : '-'}{qty.toLocaleString()} <span className="text-xs font-normal text-slate-500">{getFinishedGoodUnit(t.item)}</span>
                      </span>
                    </td>
                    <td className="p-3.5 text-xs font-semibold text-slate-700">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/80">
                        {t.reason || 'PRODUCTION'}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-xs text-slate-400">
                      {t.refId ? `#${t.refId.substring(0, 8).toUpperCase()}` : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
