import { ArrowUpRight, ArrowDownRight, History, Package, ArrowLeftRight, Calendar } from 'lucide-react';

export default function InventoryTransactionHistoryTable({ 
  transactions = [], 
  isLoading = false
}) {

  return (
    <div className="table-container">
      <div className="p-4 border-b border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <History className="w-4 h-4 text-brand" />
            Audit Ledger
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Detailed record of stock entries, dispatches, and transfers.</p>
        </div>
        <span className="text-xs font-mono font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full shadow-2xs">
          {transactions.length} Logs
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead>
            <tr>
              <th className="table-th">Date & Time</th>
              <th className="table-th">Finished Product</th>
              <th className="table-th">Movement</th>
              <th className="table-th">Quantity</th>
              <th className="table-th">Location</th>
              <th className="table-th">Batch Ref</th>
              <th className="table-th">Reason</th>
              <th className="table-th">Expiry (FIFO)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan="8" className="p-10 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2 font-medium text-xs">
                    <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                    Loading audit transactions...
                  </div>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-10 text-center text-slate-400">
                  <Package size={28} className="mx-auto mb-2 opacity-30 text-slate-400" />
                  <span className="text-xs font-medium">No transactions recorded yet.</span>
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
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors text-xs">
                    <td className="table-td text-slate-600 font-mono">
                      <span className="font-semibold text-slate-800 block">{new Date(t.createdAt).toLocaleDateString()}</span>
                      <span className="text-[11px] text-slate-400">{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="table-td font-semibold text-slate-800">
                      {t.item?.name || 'Finished Product'}
                    </td>
                    <td className="table-td">
                      {isTransfer ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold">
                          <ArrowLeftRight size={12} /> TRANSFER
                        </span>
                      ) : isIN ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          <ArrowUpRight size={12} /> INBOUND
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                          <ArrowDownRight size={12} /> OUTBOUND
                        </span>
                      )}
                    </td>
                    <td className="table-td">
                      <span className={`font-mono font-bold text-xs ${isTransfer ? 'text-sky-700' : isIN ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isTransfer ? '↔' : isIN ? '+' : '-'}{qty.toLocaleString()} <span className="text-[10px] font-normal text-slate-400 font-sans">{getFinishedGoodUnit(t.item)}</span>
                      </span>
                    </td>
                    <td className="table-td text-[11px] font-semibold text-slate-700">
                      {locDisplay}
                    </td>
                    <td className="table-td font-mono text-xs text-slate-500">
                      {batchDisplay}
                    </td>
                    <td className="table-td text-slate-600 truncate max-w-[200px]">
                      {t.reason || 'PRODUCTION'}
                    </td>
                    <td className="table-td text-[11px] text-slate-500 font-mono">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        {t.expiryDate ? new Date(t.expiryDate).toLocaleDateString() : 'FIFO: +1 Yr'}
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
  );
}
