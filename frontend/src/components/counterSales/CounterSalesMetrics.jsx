export default function CounterSalesMetrics({ 
  todayTotalRevenue = 0, 
  todayLitres = 0, 
  todayCash = 0, 
  todayCredit = 0,
  todayBottles = 0,
  todayCaps = 0,
  loading = false
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map(idx => (
          <div key={idx} className="card-surface p-3.5 space-y-2 animate-pulse border border-slate-200">
            <div className="h-3 bg-slate-200 rounded w-20"></div>
            <div className="h-6 bg-slate-200 rounded w-28"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div className="card-surface p-3.5 border border-slate-200">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Today's Sales</span>
        <div className="text-lg sm:text-xl font-mono font-bold text-brand">Rs. {Number(todayTotalRevenue || 0).toLocaleString()}</div>
      </div>

      <div className="card-surface p-3.5 border border-slate-200">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Today's Volume</span>
        <div className="text-lg sm:text-xl font-mono font-bold text-slate-800">{Number(todayLitres || 0).toLocaleString()} L</div>
      </div>

      <div className="card-surface p-3.5 border border-slate-200">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Cash Collected</span>
        <div className="text-lg sm:text-xl font-mono font-bold text-emerald-600">Rs. {Number(todayCash || 0).toLocaleString()}</div>
      </div>

      <div className="card-surface p-3.5 border border-slate-200">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Credit Outstanding</span>
        <div className="text-lg sm:text-xl font-mono font-bold text-amber-600">Rs. {Number(todayCredit || 0).toLocaleString()}</div>
      </div>

      <div className="card-surface p-3.5 border border-slate-200">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
          Bottles Sold
        </span>
        <div className="text-lg sm:text-xl font-mono font-bold text-indigo-600">
          {Number(todayBottles || 0).toLocaleString()}
        </div>
      </div>

      <div className="card-surface p-3.5 border border-slate-200">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
          Caps Issued
        </span>
        <div className="text-lg sm:text-xl font-mono font-bold text-amber-600">
          {Number(todayCaps || 0).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
