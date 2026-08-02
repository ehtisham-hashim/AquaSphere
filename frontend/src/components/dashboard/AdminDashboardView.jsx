import { ShieldAlert, Package, ShoppingCart, AlertTriangle } from 'lucide-react';
import LowStockAlertGrid from './LowStockAlertGrid';
import AlertsSection from './AlertsSection';

export default function AdminDashboardView({ data, summary, summaryLoading }) {
  return (
    <div className="space-y-8 p-2 max-w-[98%] mx-auto">
      {/* 1. System & Operations Alerts */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert size={20} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">System & Operations Control</h2>
        </div>
        <AlertsSection />
      </section>

      {/* 2. Low Stock Material Warnings */}
      <LowStockAlertGrid count={data.lowStockMaterialsCount} list={data.lowStockMaterialsList} />

      {/* 3. Operational Overview Cards */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Package size={20} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Procurement & Inventory Health</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-purple-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Monthly Procurement Total</h4>
              <p className="text-3xl font-black text-slate-800">
                Rs. {Number(data.monthlyPurchases || 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">Raw material spend logged this month.</p>
            </div>
            <div className="bg-purple-50 text-purple-600 p-4 rounded-full"><ShoppingCart size={32} /></div>
          </div>

          <div className="bg-white border border-amber-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Low Stock Alert Count</h4>
              <p className={`text-3xl font-black ${data.lowStockMaterialsCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {data.lowStockMaterialsCount || 0} Material(s)
              </p>
              <p className="text-xs text-slate-500 mt-1">Items below safety reorder levels.</p>
            </div>
            <div className="bg-amber-50 text-amber-600 p-4 rounded-full"><AlertTriangle size={32} /></div>
          </div>
        </div>
      </section>
    </div>
  );
}
