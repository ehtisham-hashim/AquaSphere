export default function ExpensesSummaryCards({ expenses = [], filteredExpenses = [], timeRange = 'MONTHLY' }) {
  const now = new Date();

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const monthTotal = expenses
    .filter(e => new Date(e.createdAt) >= startOfMonth)
    .reduce((s, e) => s + Math.round(Number(e.amount || 0)), 0);

  const yearTotal = expenses
    .filter(e => new Date(e.createdAt) >= startOfYear)
    .reduce((s, e) => s + Math.round(Number(e.amount || 0)), 0);

  const filteredSum = filteredExpenses.reduce((s, e) => s + Math.round(Number(e.amount || 0)), 0);

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'DAILY': return "Today's Total";
      case 'WEEKLY': return "This Week's Total";
      case 'MONTHLY': return "This Month's Total";
      case 'QUARTERLY': return "This Quarter's Total";
      case 'YEARLY': return "This Year's Total";
      case 'LIFETIME': return "Lifetime Total";
      default: return "Selected Horizon Total";
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
          {getTimeRangeLabel()}
        </span>
        <div className="text-xl font-black text-emerald-700">Rs. {filteredSum.toLocaleString()}</div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">This Month</span>
        <div className="text-xl font-black text-indigo-700">Rs. {monthTotal.toLocaleString()}</div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">This Year</span>
        <div className="text-xl font-black text-blue-700">Rs. {yearTotal.toLocaleString()}</div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Displaying Logs</span>
        <div className="text-xl font-black text-slate-800">
          {filteredExpenses.length} <span className="text-xs font-normal text-slate-400">/ {expenses.length} total</span>
        </div>
      </div>
    </div>
  );
}
