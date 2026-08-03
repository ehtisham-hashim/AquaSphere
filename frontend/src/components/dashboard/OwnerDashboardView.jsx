import { Wallet, TrendingUp, Receipt, ShoppingCart, ShieldCheck, CreditCard, Sparkles } from 'lucide-react';
import DashboardKpiCard from './DashboardKpiCard';
import PurchasingSummaryTab from './PurchasingSummaryTab';
import LowStockAlertGrid from './LowStockAlertGrid';
import { getCompanyFromCookie } from '../../utils/companyCookie';

export default function OwnerDashboardView({ data, summary, summaryLoading }) {
  const tenant = getCompanyFromCookie();
  const companyTitle = tenant === 'wadaana' ? 'Wadaana Industries' : 'AquaSphere';
  const netCash = Number(data?.cash || 0) - Number(data?.expenses || 0);

  return (
    <div className="space-y-8 p-2 max-w-[98%] mx-auto pb-10">
      {/* ── Top Executive Banner ───────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
              <Sparkles size={12} className="text-indigo-500" />
              {companyTitle} • EXECUTIVE CONTROL
            </span>
            <span className="text-xs text-slate-500 font-medium">Full Financial & Operations Oversight</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black mt-2 tracking-tight text-slate-900 flex items-center gap-2">
            Executive Owner Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Live database overview of sales revenue, cash inflow, operating expenses, procurement costs, and inventory health.
          </p>
        </div>

        {/* Primary High-Level Metric Badge */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center gap-4 min-w-[240px]">
          <div className={`p-3 rounded-xl ${netCash >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
            <Wallet size={28} />
          </div>
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Today&apos;s Net Cash Position</span>
            <div className={`text-2xl font-black font-mono ${netCash >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              Rs. {netCash.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 block font-medium">Cash Collected - Operating Expenses</span>
          </div>
        </div>
      </div>

      {/* ── 1. Executive Financial Overview Grid ────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Executive Financial Overview</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <DashboardKpiCard icon={<Wallet />} title="TODAY'S SALES" value={`Rs. ${Number(data?.sales || 0).toLocaleString()}`} subtitle={`${data?.bottlesSold || 0} orders today`} color="text-sky-600" bg="bg-sky-50" border="border-sky-100" />
          <DashboardKpiCard icon={<CreditCard />} title="CASH COLLECTED" value={`Rs. ${Number(data?.cash || 0).toLocaleString()}`} subtitle="Cash received today" color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-100" />
          <DashboardKpiCard icon={<Receipt />} title="EXPENSES TODAY" value={`Rs. ${Number(data?.expenses || 0).toLocaleString()}`} subtitle="Logged operating cost" color="text-rose-600" bg="bg-rose-50" border="border-rose-100" />
          <DashboardKpiCard icon={<Wallet />} title="NET CASH" value={`Rs. ${netCash.toLocaleString()}`} subtitle="Cash - Expenses" color={netCash >= 0 ? "text-emerald-700" : "text-rose-700"} bg={netCash >= 0 ? "bg-emerald-50" : "bg-rose-50"} border={netCash >= 0 ? "border-emerald-100" : "border-rose-100"} />
          <DashboardKpiCard icon={<ShoppingCart />} title="TODAY'S PURCHASES" value={`Rs. ${Number(data?.todaysPurchases || 0).toLocaleString()}`} subtitle={`${data?.todaysPurchasesCount || 0} purchase logs`} color="text-purple-600" bg="bg-purple-50" border="border-purple-100" />
        </div>
      </section>

      {/* ── 2. Purchasing & Vendor Payables Cards ───────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart size={20} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Purchasing & Vendor Payables</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-purple-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Monthly Purchases Total</h4>
              <p className="text-3xl font-black text-slate-800 font-mono">
                Rs. {Number(data?.monthlyPurchases || 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">Raw material spend this month.</p>
            </div>
            <div className="bg-purple-50 text-purple-600 p-4 rounded-full"><ShoppingCart size={32} /></div>
          </div>

          <div className="bg-white border border-rose-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pending Vendor Payables</h4>
              <p className="text-3xl font-black text-rose-600 font-mono">
                Rs. {Number(data?.pendingVendorPayables || 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">Total outstanding debt owed to suppliers.</p>
            </div>
            <div className="bg-rose-50 text-rose-500 p-4 rounded-full"><Receipt size={32} /></div>
          </div>
        </div>
      </section>

      {/* ── 3. Low Stock Raw Material Warning ───────────────────────────────── */}
      <LowStockAlertGrid count={data?.lowStockMaterialsCount} list={data?.lowStockMaterialsList} />

      {/* ── 4. Purchasing & Vendor Summary ──────────────────────────────────── */}
      <PurchasingSummaryTab summary={summary} loading={summaryLoading} />
    </div>
  );
}
