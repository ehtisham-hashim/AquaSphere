import { ShoppingCart, Receipt } from 'lucide-react';

export default function PurchasingPayables({ data }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <ShoppingCart size={20} className="text-slate-400" />
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Purchasing & Vendor Payables</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-purple-100 rounded-2xl p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Monthly Purchases Total</h4>
            <p className="text-3xl font-black text-slate-800">
              Rs. {Number(data?.monthlyPurchases || 0).toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-1">Raw material spend this month.</p>
          </div>
          <div className="bg-purple-50 text-purple-600 p-4 rounded-full">
            <ShoppingCart size={32} />
          </div>
        </div>

        <div className="bg-white border border-rose-100 rounded-2xl p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pending Vendor Payables</h4>
            <p className="text-3xl font-black text-rose-600">
              Rs. {Number(data?.pendingVendorPayables || 0).toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-1">Total outstanding debt owed to suppliers.</p>
          </div>
          <div className="bg-rose-50 text-rose-500 p-4 rounded-full">
            <Receipt size={32} />
          </div>
        </div>
      </div>
    </section>
  );
}
