import { Wallet, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

export default function DrawerReconciliationCard({
  expectedCash = 0,
  actualCash,
  onActualCashChange,
  notes,
  onNotesChange,
  disabled = false
}) {
  const numActual = actualCash !== '' && actualCash !== null && actualCash !== undefined ? parseFloat(actualCash) : null;
  const numExpected = Number(expectedCash || 0);

  let diff = null;
  let statusBadge = null;

  if (numActual !== null && !isNaN(numActual)) {
    diff = numActual - numExpected;
    if (Math.abs(diff) < 0.01) {
      statusBadge = (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle size={14} className="text-emerald-600" /> Matched
        </span>
      );
    } else if (diff < 0) {
      statusBadge = (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertCircle size={14} className="text-rose-600" /> Rs. {Math.abs(Math.round(diff)).toLocaleString()} Short
        </span>
      );
    } else {
      statusBadge = (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <AlertTriangle size={14} className="text-amber-600" /> Rs. {Math.round(diff).toLocaleString()} Extra
        </span>
      );
    }
  }

  return (
    <div className="card-surface p-5 border-2 border-indigo-100 bg-white space-y-4 rounded-xl shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <Wallet size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Cash Drawer Physical Count & Reconciliation
            </h3>
            <p className="text-xs text-slate-500">
              Audit physical currency in cash register drawer vs system expected net collections
            </p>
          </div>
        </div>

        {statusBadge && (
          <div className="shrink-0">
            {statusBadge}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        {/* 1. System Expected Cash */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            System Expected Net Cash
          </span>
          <span className="text-lg font-mono font-black text-slate-800">
            Rs. {numExpected.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">Deliveries + Spot - Expenses</span>
        </div>

        {/* 2. Physical Cash in Drawer Input */}
        <div className="sm:col-span-2 space-y-1.5">
          <label className="block text-xs font-bold text-slate-800">
            Physical Cash in Drawer: <span className="font-mono text-indigo-600">Rs.</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">
              Rs.
            </span>
            <input
              type="number"
              step="any"
              min="0"
              disabled={disabled}
              placeholder={numExpected.toString()}
              value={actualCash}
              onChange={(e) => onActualCashChange(e.target.value)}
              className="input-base pl-10 text-sm font-mono font-black text-slate-900 w-full disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
          </div>
          {diff !== null && Math.abs(diff) >= 0.01 && (
            <p className={`text-[11px] font-semibold ${diff < 0 ? 'text-rose-600' : 'text-amber-600'}`}>
              Discrepancy: Drawer is {diff < 0 ? `Rs. ${Math.abs(Math.round(diff)).toLocaleString()} short` : `Rs. ${Math.round(diff).toLocaleString()} over`} relative to calculated collections.
            </p>
          )}
        </div>
      </div>

      {/* Discrepancy / Closing Notes */}
      <div>
        <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
          Reconciliation Notes / Drawer Remarks
        </label>
        <input
          type="text"
          disabled={disabled}
          placeholder="e.g. Verified by drawer count; petty cash adjustment notes..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="input-base text-xs py-2 w-full disabled:bg-slate-100"
        />
      </div>
    </div>
  );
}
