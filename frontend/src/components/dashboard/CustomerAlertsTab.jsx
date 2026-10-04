import { AlertTriangle, Clock } from 'lucide-react';

export default function CustomerAlertsTab({ inactiveCustomers = [] }) {
  return (
    <div className="grid grid-cols-1 gap-4">

      {/* Inactive Customers (>7 Days) */}
      <div className="card-surface p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Inactive Customers ({'>'}7 Days)
          </h3>
          <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-black rounded-lg">
            {inactiveCustomers.length}
          </span>
        </div>
        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
          {inactiveCustomers.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">All active customers ordered within 7 days.</p>
          ) : (
            inactiveCustomers.map((c) => (
              <div key={c.id} className="py-3.5 flex items-center justify-between text-sm">
                <div>
                  <span className="font-bold text-slate-800 block">{c.name}</span>
                  <span className="text-xs text-slate-400 block font-mono">{c.phone}</span>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 font-bold text-xs rounded-xl inline-block">
                    {c.daysSinceLastOrder || '>7'} days inactive
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
