export default function CounterSalesMetrics({ 
  todayTotalRevenue, 
  todayLitres, 
  todayCash, 
  todayCredit 
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="card-surface p-3.5">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Today's Sales</span>
        <div className="text-lg sm:text-xl font-mono font-bold text-brand">Rs. {todayTotalRevenue.toLocaleString()}</div>
      </div>

      <div className="card-surface p-3.5">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Today's Volume</span>
        <div className="text-lg sm:text-xl font-mono font-bold text-slate-800">{todayLitres.toLocaleString()} L</div>
      </div>

      <div className="card-surface p-3.5">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Cash Collected</span>
        <div className="text-lg sm:text-xl font-mono font-bold text-emerald-600">Rs. {todayCash.toLocaleString()}</div>
      </div>

      <div className="card-surface p-3.5">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Credit Outstanding</span>
        <div className="text-lg sm:text-xl font-mono font-bold text-amber-600">Rs. {todayCredit.toLocaleString()}</div>
      </div>
    </div>
  );
}
