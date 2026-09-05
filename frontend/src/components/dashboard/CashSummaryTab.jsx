import { DollarSign, CheckCircle, AlertCircle, ShoppingCart, TrendingDown, Lock, Clock, Receipt } from 'lucide-react';
import { getCompanyFromCookie } from '../../utils/companyCookie';

export default function CashSummaryTab({
  summary = {
    cashFromOrders: 0,
    cashFromSpot: 0,
    totalExpenses: 0,
    netCash: 0,
    ordersDelivered: 0,
    pendingOrders: 0,
    spotSales: 0,
    ordersTotal: 0,
    expenseCount: 0,
    expenseList: [],
  },
  cashData = null,
  closeStatus = { isClosed: false },
  onConfirmClose,
  closing = false,
  closeMsg = null,
  role = 'ACCOUNTANT',
}) {
  const company = getCompanyFromCookie();
  const totalIn = cashData?.totalCashCollected || (summary.cashFromOrders + summary.cashFromSpot) || 0;
  const fromOrders = cashData?.fromOrders || summary.cashFromOrders || 0;
  const fromSpot = cashData?.fromSpotSales || summary.cashFromSpot || 0;
  const canConfirmDay = role === 'ACCOUNTANT' || role === 'OWNER';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Cash & Day Closing Summary</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {closeStatus?.isClosed ? (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold shadow-xs">
            <Lock size={16} /> Day Closed & Locked
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-sm font-bold shadow-xs">
            <Clock size={16} /> Day Open
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Cash from Orders', value: `₨ ${fromOrders.toLocaleString()}`, icon: ShoppingCart, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Cash from Counter', value: `₨ ${fromSpot.toLocaleString()}`, icon: DollarSign, color: 'text-brand-primary', bg: 'bg-brand-muted' },
          { label: 'Total Expenses', value: `₨ ${Number(summary.totalExpenses).toLocaleString()}`, icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Net Cash Balance', value: `₨ ${(totalIn - (summary.totalExpenses || 0)).toLocaleString()}`, icon: CheckCircle, color: totalIn >= summary.totalExpenses ? 'text-emerald-700' : 'text-rose-700', bg: totalIn >= summary.totalExpenses ? 'bg-emerald-50' : 'bg-rose-50' },
        ].map((k) => (
          <div key={k.label} className="card-surface p-4 sm:p-5">
            <div className={`w-9 h-9 ${k.bg} rounded-xl flex items-center justify-center mb-2.5`}>
              <k.icon size={18} className={k.color} />
            </div>
            <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">{k.label}</div>
            <div className={`text-xl sm:text-2xl font-mono font-black mt-0.5 ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Sales & Activity breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(company === 'wadaana' ? [
          { label: 'Orders Delivered', value: summary.ordersDelivered || 0 },
          { label: 'Pending Orders', value: summary.pendingOrders || 0 },
          { label: 'Counter Sales', value: summary.spotSales || 0 },
          { label: 'Total Orders', value: summary.ordersTotal || 0 },
        ] : [
          { label: '19L Delivery Sales', value: summary.ordersDelivered || 0 },
          { label: 'Counter Sales', value: summary.spotSales || 0 },
          { label: '0.5L PET Sales', value: (summary.ordersDelivered || 0) > 0 ? `${summary.ordersDelivered * 2} packs` : '0 packs' },
          { label: '1.5L PET Sales', value: (summary.ordersDelivered || 0) > 0 ? `${summary.ordersDelivered} packs` : '0 packs' },
        ]).map((s) => (
          <div key={s.label} className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs text-slate-500 font-semibold">{s.label}</div>
            <div className="text-2xl font-black text-slate-800 mt-1 font-mono">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Expense List Table */}
      {summary.expenseList && summary.expenseList.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
            <Receipt size={18} className="text-rose-500" />
            <h3 className="font-bold text-slate-800 text-sm">Today&apos;s Expenses Breakdown</h3>
            <span className="ml-auto text-xs font-semibold text-slate-500">{summary.expenseCount} entries — Rs. {Number(summary.totalExpenses).toLocaleString()}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Category</th>
                  <th className="px-5 py-3 text-left">Remarks</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.expenseList.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-semibold text-slate-800">{e.category}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{e.remarks || '—'}</td>
                    <td className="px-5 py-3 text-right font-bold text-rose-600 font-mono">Rs. {Number(e.amount).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right">
                      {e.receiptUrl ? (
                        <a href={e.receiptUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 hover:underline">View Receipt</a>
                      ) : (
                        <span className="text-xs text-rose-400 font-semibold flex items-center gap-1 justify-end"><AlertCircle size={12} /> Missing</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation section for Accountant / Owner */}
      {!closeStatus?.isClosed && canConfirmDay && onConfirmClose && (
        <div className="bg-gradient-to-br from-indigo-50/80 to-white border border-indigo-100 rounded-2xl shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
            <CheckCircle size={20} className="text-emerald-600" /> Day Confirmation & Verification
          </h3>
          <p className="text-sm text-slate-600">
            Confirm all financial entries, cash reconciliations, and expense logs for today before the day is locked:
          </p>
          {closeMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold rounded-xl">
              {closeMsg}
            </div>
          )}
          <button
            onClick={onConfirmClose}
            disabled={closing}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl font-bold text-sm transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CheckCircle size={18} />
            {closing ? 'Confirming Records...' : 'Confirm — All Financial Entries Complete for Today'}
          </button>
        </div>
      )}
    </div>
  );
}
