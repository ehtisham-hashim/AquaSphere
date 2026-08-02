import { Wallet, TrendingUp, CreditCard, Receipt, ShoppingCart } from 'lucide-react';
import DashboardKpiCard from './DashboardKpiCard';
import PurchasingSummaryTab from './PurchasingSummaryTab';

export default function AccountantDashboardView({ data, summary, summaryLoading }) {
  return (
    <div className="space-y-8 p-2 max-w-[98%] mx-auto">
      {/* 1. Financial & Cash Overview */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Finance & Cash Ledger Overview</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <DashboardKpiCard icon={<CreditCard />} title="CASH COLLECTED" value={`Rs. ${Number(data.cash || 0).toLocaleString()}`} subtitle="Cash received today" color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-100" />
          <DashboardKpiCard icon={<Wallet />} title="TODAY'S SALES" value={`Rs. ${Number(data.sales || 0).toLocaleString()}`} subtitle="Total sales revenue" color="text-sky-600" bg="bg-sky-50" border="border-sky-100" />
          <DashboardKpiCard icon={<CreditCard />} title="CREDIT SALES" value={`Rs. ${Number(data.credit || 0).toLocaleString()}`} subtitle="Billed on credit" color="text-orange-600" bg="bg-orange-50" border="border-orange-100" />
          <DashboardKpiCard icon={<Receipt />} title="EXPENSES TODAY" value={`Rs. ${Number(data.expenses || 0).toLocaleString()}`} subtitle="Logged operating cost" color="text-rose-600" bg="bg-rose-50" border="border-rose-100" />
          <DashboardKpiCard icon={<ShoppingCart />} title="TODAY'S PURCHASES" value={`Rs. ${Number(data.todaysPurchases || 0).toLocaleString()}`} subtitle={`${data.todaysPurchasesCount || 0} purchase logs`} color="text-purple-600" bg="bg-purple-50" border="border-purple-100" />
        </div>
      </section>

      {/* 2. Vendor Payables Summary */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Receipt size={20} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Vendor Payables & Accounts Ledger</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-rose-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pending Vendor Payables</h4>
              <p className="text-3xl font-black text-rose-600">
                Rs. {Number(data.pendingVendorPayables || 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">Total outstanding debt owed to suppliers.</p>
            </div>
            <div className="bg-rose-50 text-rose-500 p-4 rounded-full"><Receipt size={32} /></div>
          </div>

          <div className="bg-white border border-purple-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Monthly Material Purchases</h4>
              <p className="text-3xl font-black text-slate-800">
                Rs. {Number(data.monthlyPurchases || 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">Raw material spend this month.</p>
            </div>
            <div className="bg-purple-50 text-purple-600 p-4 rounded-full"><ShoppingCart size={32} /></div>
          </div>
        </div>
      </section>

      {/* 3. Purchasing & Vendor Ledgers */}
      <PurchasingSummaryTab summary={summary} loading={summaryLoading} />
    </div>
  );
}
