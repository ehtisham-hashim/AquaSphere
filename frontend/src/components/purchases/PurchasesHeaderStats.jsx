import { ShoppingCart, CreditCard, Receipt } from 'lucide-react';

export default function PurchasesHeaderStats({ totalCount, totalAmount }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Purchases</p>
          <h3 className="text-2xl font-black text-slate-800">{totalCount} Record{totalCount === 1 ? '' : 's'}</h3>
        </div>
        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
          <ShoppingCart size={24} />
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Procurement Value</p>
          <h3 className="text-2xl font-black text-slate-800">Rs. {Number(totalAmount || 0).toLocaleString()}</h3>
        </div>
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
          <CreditCard size={24} />
        </div>
      </div>
    </div>
  );
}
