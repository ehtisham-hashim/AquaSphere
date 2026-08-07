export default function CounterSalesMetrics({ 
  todayTotalRevenue, 
  todayLitres, 
  todayCash, 
  todayCredit 
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Today&apos;s Counter Sales</span>
        <div className="text-xl font-black text-emerald-700">Rs. {todayTotalRevenue.toLocaleString()}</div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Today&apos;s Litres</span>
        <div className="text-xl font-black text-blue-900">{todayLitres.toLocaleString()} L</div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Cash Collected</span>
        <div className="text-xl font-black text-emerald-600">Rs. {todayCash.toLocaleString()}</div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Credit Outstanding</span>
        <div className="text-xl font-black text-purple-900">Rs. {todayCredit.toLocaleString()}</div>
      </div>
    </div>
  );
}
