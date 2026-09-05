import { ShoppingCart, Receipt } from 'lucide-react';

export default function PurchasingPayables({ data }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <ShoppingCart size={20} className="text-slate-400" />
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Purchasing & Vendor Payables</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card-surface p-4 sm:p-5 flex items-center justify-between">
          <div>
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Monthly Purchases Total</h4>
            <p className="font-mono text-2xl sm:text-3xl font-black text-slate-900">
              ₨ {Number(data?.monthlyPurchases || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Raw material spend this month.</p>
          </div>
          <div className="bg-indigo-50 text-indigo-700 p-3 rounded-xl">
            <ShoppingCart size={24} />
          </div>
        </div>

        <div className="card-surface p-4 sm:p-5 flex items-center justify-between">
          <div>
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pending Vendor Payables</h4>
            <p className="font-mono text-2xl sm:text-3xl font-black text-rose-600">
              ₨ {Number(data?.pendingVendorPayables || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Total outstanding debt owed to suppliers.</p>
          </div>
          <div className="bg-rose-50 text-rose-600 p-3 rounded-xl">
            <Receipt size={24} />
          </div>
        </div>
      </div>
    </section>
  );
}
