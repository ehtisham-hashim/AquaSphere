import { Factory, ShoppingBag, Sliders, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function StockSourceBreakdown({ transactions = [], _tenant = 'aquasphere' }) {

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
    <div className="card-surface p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
            <Factory className="w-4 h-4 text-brand-primary" />
            Stock Origin & Flow
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Live breakdown of finished goods stock additions vs dispatches.</p>
        </div>
        <div className="flex items-center gap-4 text-sm font-semibold">
          <span className="flex items-center gap-1.5 text-emerald-700">
            <ArrowUpRight size={16} /> +{totalIn.toLocaleString()} Inbound
          </span>
          <span className="flex items-center gap-1.5 text-rose-700">
            <ArrowDownRight size={16} /> -{totalOut.toLocaleString()} Dispatched
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        {/* Source 1: Factory Production */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-500">
            <Factory size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Factory Production</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">+{productionIn.toLocaleString()} <span className="text-sm font-normal text-slate-400">Units</span></div>
          <p className="text-xs text-slate-500 max-w-[250px]">Stock added directly from completed factory production batches.</p>
        </div>

        {/* Source 2: Dispatches & Sales */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-500">
            <ShoppingBag size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Sales & Dispatches</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">-{customerSalesOut.toLocaleString()} <span className="text-sm font-normal text-slate-400">Units</span></div>
          <p className="text-xs text-slate-500 max-w-[250px]">Dispatched to customers via Spot Sales & Order deliveries.</p>
        </div>

        {/* Source 3: Physical Stock Verification */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-500">
            <Sliders size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Stock Verification</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">+{manualAdjustments.toLocaleString()} <span className="text-sm font-normal text-slate-400">Units</span></div>
          <p className="text-xs text-slate-500 max-w-[250px]">Owner-approved stock verifications and initial balances.</p>
        </div>
      </div>
    </div>
  );
}
