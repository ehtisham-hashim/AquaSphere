import { ArrowUpRight, ArrowDownRight, History, Package, ArrowLeftRight, Calendar } from 'lucide-react';

export default function InventoryTransactionHistoryTable({ 
  transactions = [], 
  isLoading = false,
  tenant = 'aquasphere' 
}) {
  const isWadaana = tenant === 'wadaana';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all">
      <div className="p-5 border-b border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <History className={`w-5 h-5 ${isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'}`} />
            Audit Ledger
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Detailed record of stock entries, dispatches, and transfers.</p>
        </div>
        <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200/80 px-3 py-1 rounded-full shadow-2xs">
          {transactions.length} Logs
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-slate-50/90 border-b border-slate-200 backdrop-blur">
            <tr>
              <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">Date & Time</th>
              <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">Finished Product</th>
              <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">Movement</th>
              <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">Quantity</th>
              <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">Location</th>
              <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">Batch Ref</th>
              <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">Reason</th>
              <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">Expiry (FIFO)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan="8" className="p-12 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2 font-medium text-sm">
                    <div className={`w-5 h-5 border-2 ${isWadaana ? 'border-[#0ea5e9]' : 'border-emerald-600'} border-t-transparent rounded-full animate-spin`}></div>
                    Loading audit transactions...
                  </div>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-12 text-center text-slate-400">
                  <Package size={32} className="mx-auto mb-2 opacity-40" />
                  <span className="text-sm font-medium">No transactions recorded yet.</span>
                </td>
              </tr>
            ) : (
              transactions.map(t => {
                const isIN = t.direction === 'IN';
                const isTransfer = (t.reason || '').toUpperCase().includes('TRANSFER');
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

                const batchDisplay = t.batchNo || (t.refId ? `AQ-#${t.refId.substring(0, 8).toUpperCase()}` : 'AQ-BATCH-AUTO');
                const locDisplay = t.location || 'FACTORY';

                return (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors text-sm">
                    <td className="p-4 text-slate-600">
                      <span className="font-bold text-slate-800 block">{new Date(t.createdAt).toLocaleDateString()}</span>
                      <span className="text-xs text-slate-400 font-medium">{new Date(t.createdAt).toLocaleTimeString()}</span>
                    </td>
                    <td className="p-4 font-bold text-slate-800">
                      {t.item?.name || 'Finished Product'}
                    </td>
                    <td className="p-4">
                      {isTransfer ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-50 text-[#0ea5e9] border border-sky-200 text-xs font-bold">
                          <ArrowLeftRight size={13} /> TRANSFER
                        </span>
                      ) : isIN ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                          <ArrowUpRight size={13} /> INBOUND
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                          <ArrowDownRight size={13} /> OUTBOUND
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`font-extrabold text-base ${isTransfer ? 'text-[#0ea5e9]' : isIN ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isTransfer ? '↔' : isIN ? '+' : '-'}{qty.toLocaleString()} <span className="text-xs font-normal text-slate-500">{getFinishedGoodUnit(t.item)}</span>
                      </span>
                    </td>
                    <td className="p-4 text-xs font-bold text-slate-700">
                      {locDisplay}
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-500 font-medium">
                      {batchDisplay}
                    </td>
                    <td className="p-4 text-sm font-semibold text-slate-700 truncate max-w-[200px]">
                      {t.reason || 'PRODUCTION'}
                    </td>
                    <td className="p-4 text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                      <Calendar size={14} className="text-slate-400" />
                      {t.expiryDate ? new Date(t.expiryDate).toLocaleDateString() : 'FIFO: +1 Year'}
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
