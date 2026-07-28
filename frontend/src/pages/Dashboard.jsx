import { useAuth } from '../context/AuthContext';
import { API_URL } from '../utils/api';
import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, CreditCard, Receipt, ShoppingCart, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({
    sales: 0,
    cash: 0,
    expenses: 0,
    credit: 0,
    bottlesSold: 0,
    todaysPurchases: 0,
    todaysPurchasesCount: 0,
    monthlyPurchases: 0,
    pendingVendorPayables: 0,
    lowStockMaterialsCount: 0,
    lowStockMaterialsList: []
  });

  useEffect(() => {
    const sse = new EventSource(`${API_URL}/analytics/dashboard/stream`, {
      withCredentials: true
    });

    sse.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.success) setData(parsed.data);
      } catch (err) {
        console.error('Failed to parse SSE data', err);
      }
    };

    sse.onerror = (err) => {
      console.error('SSE Error:', err);
    };

    return () => sse.close();
  }, []);

  const isOwner = user?.role === 'OWNER';
  const isAccountant = user?.role === 'ACCOUNTANT';
  const isAdmin = user?.role === 'ADMIN';
  const isProductionManager = user?.role === 'PRODUCTION_MANAGER';

  const canViewFinancials = isOwner || isAccountant;
  const canViewInventory = isOwner || isAdmin || isProductionManager;

  return (
    <div className="space-y-8 p-2 max-w-[98%] mx-auto">
      {/* Financial Overview */}
      {canViewFinancials && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Financial Overview</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <KpiCard icon={<Wallet />} title="TODAY'S SALES" value={`Rs. ${Number(data.sales).toLocaleString()}`} subtitle="Total sales value" color="text-sky-600" bg="bg-sky-50" border="border-sky-100" />
            <KpiCard icon={<CreditCard />} title="CASH COLLECTED" value={`Rs. ${Number(data.cash).toLocaleString()}`} subtitle="Cash received today" color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-100" />
            <KpiCard icon={<CreditCard />} title="CREDIT SALES" value={`Rs. ${Number(data.credit).toLocaleString()}`} subtitle="Billed on credit" color="text-orange-600" bg="bg-orange-50" border="border-orange-100" />
            <KpiCard icon={<Receipt />} title="EXPENSES TODAY" value={`Rs. ${Number(data.expenses).toLocaleString()}`} subtitle="Logged operating cost" color="text-rose-600" bg="bg-rose-50" border="border-rose-100" />
            <KpiCard icon={<ShoppingCart />} title="TODAY'S PURCHASES" value={`Rs. ${Number(data.todaysPurchases).toLocaleString()}`} subtitle={`${data.todaysPurchasesCount} purchase logs`} color="text-purple-600" bg="bg-purple-50" border="border-purple-100" />
          </div>
        </section>
      )}

      {/* Purchasing & Vendor Balances */}
      {canViewFinancials && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={20} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Purchasing & Vendor Payables</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-purple-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Monthly Purchases Total</h4>
                <p className="text-3xl font-black text-slate-800">
                  Rs. {Number(data.monthlyPurchases).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">Raw material spend this month.</p>
              </div>
              <div className="bg-purple-50 text-purple-600 p-4 rounded-full"><ShoppingCart size={32} /></div>
            </div>

            <div className="bg-white border border-rose-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pending Vendor Payables</h4>
                <p className="text-3xl font-black text-rose-600">
                  Rs. {Number(data.pendingVendorPayables).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">Total outstanding debt owed to suppliers.</p>
              </div>
              <div className="bg-rose-50 text-rose-500 p-4 rounded-full"><Receipt size={32} /></div>
            </div>
          </div>
        </section>
      )}

      {/* Low Stock Material Warnings */}
      {canViewInventory && data.lowStockMaterialsCount > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3 text-amber-800">
            <AlertTriangle size={24} className="shrink-0 text-amber-600" />
            <div>
              <h3 className="text-base font-bold">Low Stock Raw Materials Warning</h3>
              <p className="text-xs text-amber-700">
                {data.lowStockMaterialsCount} material(s) below reorder threshold. Log purchases to refill inventory.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {data.lowStockMaterialsList.map(mat => (
              <div key={mat.id} className="bg-white p-3.5 rounded-xl border border-amber-100 flex justify-between items-center shadow-xs">
                <div>
                  <div className="font-bold text-slate-800 text-sm">{mat.name}</div>
                  <div className="text-xs text-slate-400">Reorder Level: {mat.reorderLevel} {mat.unit}</div>
                </div>
                <span className="text-sm font-black text-rose-600 px-2.5 py-1 bg-rose-50 rounded-lg">
                  {mat.cachedQty} {mat.unit}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Analytics Placeholder */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 p-2 border-b border-slate-100 bg-slate-50">
          <button className="px-5 py-2.5 bg-white border border-slate-200 shadow-sm text-slate-800 font-bold text-sm rounded-xl transition-all">
            Purchasing & Vendor Summary
          </button>
        </div>
        <div className="p-8 text-center text-slate-500 text-sm">
          Purchasing Engine integrated with Prisma Transactions, Vendor Ledger, & Inventory Auto-Updates.
        </div>
      </section>
    </div>
  );
}

function KpiCard({ icon, title, value, subtitle, color, bg, border }) {
  return (
    <div className={`bg-white border ${border} rounded-2xl p-5 shadow-sm flex flex-col h-full justify-between transition-all hover:shadow-md hover:-translate-y-0.5 group`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl ${bg} ${color} transition-transform group-hover:scale-110`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">{value}</p>
        <h4 className="text-xs font-bold text-slate-500 tracking-wider mt-2 uppercase">{title}</h4>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
