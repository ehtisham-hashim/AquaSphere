import { Factory, Building, AlertTriangle, Lock, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';

export default function ProductionKPICards({
  todaysProduction,
  finishedGoods,
  lowStockCount,
  dailyClose,
  pendingBatchesCount,
  isWadaana
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Today's Output */}
      <div className="card-surface p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Today&apos;s Output</span>
          <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
            <Factory size={16} />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-mono font-black text-slate-900">
          {isWadaana ? (
            Number(todaysProduction?.totalProduced || 0).toLocaleString()
          ) : (
            Number(todaysProduction?.total19L || (todaysProduction?.packs15L + todaysProduction?.packs05L) || 0).toLocaleString()
          )}
          <span className="text-xs font-semibold text-slate-500 ml-1">
            {isWadaana ? 'Bottles' : '19L / Packs'}
          </span>
        </div>
        <div className="text-[11px] font-medium text-slate-500 mt-1.5 flex items-center gap-1">
          <Clock size={12} className="text-slate-400" />
          <span>{todaysProduction?.batchesCount || 0} batches completed today</span>
        </div>
      </div>

      {/* Factory Stock */}
      <div className="card-surface p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Factory Floor Stock</span>
          <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
            <Building size={16} />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-mono font-black text-slate-900">
          {(finishedGoods || []).reduce((sum, item) => sum + Number(item.factoryQty || 0), 0).toLocaleString()}
          <span className="text-xs font-semibold text-slate-500 ml-1">
            {isWadaana ? 'Bottles' : 'Units'}
          </span>
        </div>
        <div className="text-[11px] font-medium text-slate-500 mt-1.5">
          Available at factory floor
        </div>
      </div>

      {/* Raw Material Health */}
      <div className="card-surface p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Raw Material Health</span>
          <div className={`p-1.5 rounded-lg ${lowStockCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
            <AlertTriangle size={16} />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-mono font-black text-slate-900">
          {lowStockCount > 0 ? lowStockCount : 'Healthy'}
          <span className="text-xs font-semibold text-slate-500 ml-1">
            {lowStockCount > 0 ? 'Low Stock' : 'Stock'}
          </span>
        </div>
        <div className="text-[11px] font-medium text-slate-500 mt-1.5">
          {lowStockCount > 0 ? `${lowStockCount} raw material(s) need refill` : 'All materials above reorder level'}
        </div>
      </div>

      {/* Daily Close Status */}
      <div className="card-surface p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Daily Close</span>
          <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
            <Lock size={16} />
          </div>
        </div>
        <div className="text-sm font-bold text-slate-900 mt-1">
          {dailyClose?.isClosed ? (
            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1">
              <CheckCircle2 size={13} /> Finalized & Locked
            </span>
          ) : dailyClose?.pmConfirmed ? (
            <span className="text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1">
              <ShieldCheck size={13} /> PM Verified ✓
            </span>
          ) : (
            <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1">
              <Clock size={13} /> Pending PM Verification
            </span>
          )}
        </div>
        <div className="text-[11px] font-medium text-slate-500 mt-2">
          {pendingBatchesCount > 0 ? `${pendingBatchesCount} batch(es) pending` : 'No pending batches'}
        </div>
      </div>
    </div>
  );
}
