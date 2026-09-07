import { ShoppingCart, CreditCard } from 'lucide-react';

export default function PurchasesHeaderStats({ totalCount, totalAmount }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="card-surface p-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Total Purchases</p>
          <h3 className="text-xl font-bold font-mono text-slate-900">{totalCount} Record{totalCount === 1 ? '' : 's'}</h3>
        </div>
        <div className="p-2.5 bg-slate-100 text-[var(--brand)] rounded-xl">
          <ShoppingCart size={20} />
        </div>
      </div>

      <div className="card-surface p-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Total Procurement Value</p>
          <h3 className="text-xl font-bold font-mono text-slate-900">Rs. {Number(totalAmount || 0).toLocaleString()}</h3>
        </div>
        <div className="p-2.5 bg-[var(--brand-light)] text-[var(--brand)] rounded-xl">
          <CreditCard size={20} />
        </div>
      </div>
    </div>
  );
}
