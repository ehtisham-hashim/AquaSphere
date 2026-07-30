import { Factory, ShoppingBag, Sliders, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function StockSourceBreakdown({ transactions = [], tenant = 'aquasphere' }) {
  const isWadaana = tenant === 'wadaana';

  // Compute breakdown metrics from transaction history
  let totalIn = 0;
  let totalOut = 0;
  let productionIn = 0;
  let customerSalesOut = 0;
  let manualAdjustments = 0;

  transactions.forEach(t => {
    const qty = Number(t.quantity || 0);
    const reason = (t.reason || '').toUpperCase();
    const dir = t.direction;

    if (dir === 'IN') {
      totalIn += qty;
      if (reason.includes('PRODUCTION') || reason.includes('BATCH')) {
        productionIn += qty;
      } else {
        manualAdjustments += qty;
      }
    } else if (dir === 'OUT') {
      totalOut += qty;
      if (reason.includes('SALE') || reason.includes('DELIVERY') || reason.includes('ORDER')) {
        customerSalesOut += qty;
      }
    }
  });

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
            <Factory className={`w-5 h-5 ${isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'}`} />
            Stock Origin & Flow Audit (How & Where Stock Comes From)
          </h3>
          <p className="text-xs text-slate-500">Live breakdown of finished goods stock additions vs dispatches.</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <ArrowUpRight size={13} /> +{totalIn.toLocaleString()} Total Inbound
          </span>
          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
            <ArrowDownRight size={13} /> -{totalOut.toLocaleString()} Dispatched Out
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Source 1: Factory Production */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">1. Factory Production</span>
            <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg"><Factory size={14} /></span>
          </div>
          <div className="text-xl font-black text-slate-800">+{productionIn.toLocaleString()} <span className="text-xs font-normal text-slate-500">Units</span></div>
          <p className="text-[11px] text-slate-500 font-medium">Stock added directly from completed factory production batches.</p>
        </div>

        {/* Source 2: Dispatches & Sales */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">2. Sales & Dispatches</span>
            <span className="p-1.5 bg-sky-100 text-sky-700 rounded-lg"><ShoppingBag size={14} /></span>
          </div>
          <div className="text-xl font-black text-slate-800">-{customerSalesOut.toLocaleString()} <span className="text-xs font-normal text-slate-500">Units</span></div>
          <p className="text-[11px] text-slate-500 font-medium">Dispatched to customers via Spot Sales & Order deliveries.</p>
        </div>

        {/* Source 3: Manual Audits */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">3. Manual Stock Takes</span>
            <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg"><Sliders size={14} /></span>
          </div>
          <div className="text-xl font-black text-slate-800">+{manualAdjustments.toLocaleString()} <span className="text-xs font-normal text-slate-500">Units</span></div>
          <p className="text-[11px] text-slate-500 font-medium">Adjustments from initial stock entries and physical stock counts.</p>
        </div>
      </div>
    </div>
  );
}
