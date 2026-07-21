import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, CreditCard, Receipt, LineChart, Package, Truck, Users, Store, Beaker } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({
    sales: 0, cash: 0, expenses: 0, credit: 0, bottlesSold: 0
  });
  
  useEffect(() => {
    const sse = new EventSource('http://localhost:3000/api/v1/analytics/dashboard/stream', {
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
      // EventSource handles reconnection automatically
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
      
      {/* Financial KPIs - Only shown once, much cleaner */}
      {canViewFinancials && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Financial Overview</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <KpiCard icon={<Wallet />} title="TODAY'S SALES" value={`Rs. ${data.sales}`} subtitle="Total sales value" color="text-sky-600" bg="bg-sky-50" border="border-sky-100" />
            <KpiCard icon={<CreditCard />} title="CASH COLLECTED" value={`Rs. ${data.cash}`} subtitle="Cash received today" color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-100" />
            <KpiCard icon={<Receipt />} title="CREDIT SALES" value={`Rs. ${data.credit}`} subtitle="Billed on credit" color="text-orange-600" bg="bg-orange-50" border="border-orange-100" />
            <KpiCard icon={<LineChart />} title="EXPENSES" value={`Rs. ${data.expenses}`} subtitle="Logged operating cost" color="text-rose-600" bg="bg-rose-50" border="border-rose-100" />
            {isOwner && <KpiCard icon={<TrendingUp />} title="EST. PROFIT" value={`Rs. ${data.sales - data.expenses}`} subtitle="Sales minus Expenses" color="text-indigo-600" bg="bg-indigo-50" border="border-indigo-100" />}
          </div>
        </section>
      )}

      {/* Operations & Orders */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Package size={20} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Operations & Orders</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={<Package />} title="PENDING ORDERS" value="0" subtitle="Awaiting delivery" color="text-amber-600" bg="bg-amber-50" border="border-amber-100" />
          <KpiCard icon={<Truck />} title="COMPLETED ORDERS" value="0" subtitle="Delivered today" color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-100" />
          <KpiCard icon={<Users />} title="TOTAL CUSTOMERS" value="0" subtitle="Registered profiles" color="text-slate-700" bg="bg-slate-100" border="border-slate-200" />
          <KpiCard icon={<Store />} title="TOTAL VENDORS" value="0" subtitle="Registered suppliers" color="text-slate-700" bg="bg-slate-100" border="border-slate-200" />
        </div>
      </section>

      {/* Receivables & Payables (Financial Context) */}
      {canViewFinancials && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={20} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Outstanding Balances</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-rose-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Customer Receivables</h4>
                <p className="text-3xl font-bold text-slate-800">Rs. 0</p>
                <p className="text-sm text-slate-500 mt-1">Money owed to us by customers.</p>
              </div>
              <div className="bg-rose-50 text-rose-500 p-4 rounded-full"><Wallet size={32} /></div>
            </div>
            <div className="bg-white border border-amber-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Vendor Payables</h4>
                <p className="text-3xl font-bold text-slate-800">Rs. 0</p>
                <p className="text-sm text-slate-500 mt-1">Money we owe to our suppliers.</p>
              </div>
              <div className="bg-amber-50 text-amber-500 p-4 rounded-full"><Receipt size={32} /></div>
            </div>
          </div>
        </section>
      )}

      {canViewInventory && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Beaker size={20} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Production & Inventory</h2>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 mb-6 uppercase tracking-wider">Chemical Stock Levels</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <ChemicalGauge name="Calcium" percentage={75} color="bg-emerald-500" />
              <ChemicalGauge name="Magnesium" percentage={45} color="bg-amber-500" />
              <ChemicalGauge name="Sodium" percentage={15} color="bg-red-500" />
            </div>
          </div>
        </section>
      )}

      {/* Tabs Section */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 p-2 border-b border-slate-100 bg-slate-50 overflow-x-auto">
          <button className="px-5 py-2.5 bg-white border border-slate-200 shadow-sm text-slate-800 font-bold text-sm rounded-xl transition-all">
            Overview Analytics
          </button>
          {canViewFinancials && (
            <button className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-all">
              Sales Trends
            </button>
          )}
          {canViewFinancials && (
            <button className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-all">
              Expense Breakdown
            </button>
          )}
        </div>
        <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-4 min-h-[300px]">
           <LineChart size={48} className="opacity-20" />
           <p className="text-sm font-medium">Detailed charts and graphs will populate here as data streams in.</p>
        </div>
      </section>
    </div>
  );
}

function ChemicalGauge({ name, percentage, color }) {
  return (
    <div>
      <div className="flex justify-between items-end mb-2">
        <span className="text-sm font-bold text-slate-700">{name}</span>
        <span className="text-sm font-black text-slate-900">{percentage}%</span>
      </div>
      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
        <div className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${percentage}%` }}></div>
      </div>
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
      </div>
    </div>
  );
}
