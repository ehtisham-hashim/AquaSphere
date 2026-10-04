import { ArrowUpRight, ArrowDownRight, History, Package, ArrowLeftRight, Calendar } from 'lucide-react';
import { usePagination } from '../../hooks/usePagination';
import TablePagination from '../common/TablePagination';

export default function InventoryTransactionHistoryTable({ 
  transactions = [], 
  isLoading = false,
  items = [],
  selectedItemId = 'ALL',
  onSelectItemId,
  _isWadaana = false
}) {
  const pagination = usePagination(transactions || [], 50);

  // Group finished goods for clean dropdown
  const finishedGoods = items.filter(i => i.type === 'FINISHED_GOOD' && !i.archivedAt);

  return (
    <div className="table-container">
      <div className="p-3.5 sm:p-4 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="w-4.5 h-4.5 text-brand" />
          <h3 className="text-sm sm:text-base font-bold text-slate-800">
            Audit Ledger
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Finished Goods Dropdown Filter */}
          <div className="relative min-w-[200px]">
            <select
              value={selectedItemId}
              onChange={(e) => onSelectItemId && onSelectItemId(e.target.value)}
              className="w-full text-xs font-semibold py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand cursor-pointer"
            >
              <option value="ALL">
                All Products ({finishedGoods.length})
              </option>
              {finishedGoods.map(fg => (
                <option key={fg.id} value={fg.id}>
                  {fg.name}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs font-mono font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs whitespace-nowrap">
            {transactions.length} Logs
          </span>
        </div>
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
                  <div className="flex items-center justify-center gap-2 font-medium text-sm">
                    <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                    Loading audit transactions...
                  </div>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-10 text-center text-slate-400">
                  <Package size={32} className="mx-auto mb-2 opacity-30 text-slate-400" />
                  <span className="text-sm font-medium">No transactions recorded yet.</span>
                </td>
              </tr>
            ) : (
              pagination.paginatedItems.map(t => {
                const isIN = t.direction === 'IN';
                const isTransfer = (t.reason || '').toUpperCase().includes('TRANSFER');
                const qty = Number(t.quantity || 0);

                const packSize = Number(t.item?.packSize || 1);
                const isPackGood = packSize > 1;
                const packs = isPackGood ? Math.floor(qty / packSize) : 0;
                const loose = isPackGood ? qty % packSize : 0;

                const batchDisplay = t.batchNo || (t.refId ? `AQ-#${t.refId.substring(0, 8).toUpperCase()}` : 'AQ-BATCH-AUTO');
                const locDisplay = t.location || 'FACTORY';

                return (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors text-xs sm:text-sm">
                    <td className="table-td text-slate-600">
                      <span className="font-semibold text-slate-800 block">{new Date(t.createdAt).toLocaleDateString()}</span>
                      <span className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="table-td font-semibold text-slate-900">
                      {t.item?.name || 'Finished Product'}
                    </td>
                    <td className="table-td">
                      {isTransfer ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold">
                          <ArrowLeftRight size={13} /> TRANSFER
                        </span>
                      ) : isIN ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                          <ArrowUpRight size={13} /> INBOUND
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
                          <ArrowDownRight size={13} /> OUTBOUND
                        </span>
                      )}
                    </td>
                    <td className="table-td">
                      <span className={`font-semibold text-sm tabular-nums ${isTransfer ? 'text-sky-700' : isIN ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isTransfer ? '↔' : isIN ? '+' : '-'}{qty.toLocaleString()} <span className="text-xs font-normal text-slate-500 font-sans">{t.item?.unit || 'bottle'}</span>
                      </span>
                      {isPackGood && (
                        <span className="block text-[11px] text-slate-500 font-normal">
                          ({packs} {packs === 1 ? 'pack' : 'packs'}{loose > 0 ? ` + ${loose} btl` : ''})
                        </span>
                      )}
                    </td>
                    <td className="table-td text-xs font-semibold text-slate-700">
                      {locDisplay}
                    </td>
                    <td className="table-td font-mono text-xs text-slate-500">
                      {batchDisplay}
                    </td>
                    <td className="table-td text-slate-600 truncate max-w-[200px]">
                      {t.reason || 'PRODUCTION'}
                    </td>
                    <td className="table-td text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
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
      <TablePagination pagination={pagination} />
    </div>
  );
}
