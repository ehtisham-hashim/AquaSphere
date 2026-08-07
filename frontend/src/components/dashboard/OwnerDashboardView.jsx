import { useState, useMemo } from 'react';
import { Wallet, TrendingUp, Receipt, ShoppingCart, CreditCard, Sparkles, Clock } from 'lucide-react';
import DashboardKpiCard from './DashboardKpiCard';
import PurchasingSummaryTab from './PurchasingSummaryTab';
import LowStockAlertGrid from './LowStockAlertGrid';
import { getCompanyFromCookie } from '../../utils/companyCookie';
import { TimeframeDropdown } from '../ui';

export default function OwnerDashboardView({ data, summary, summaryLoading }) {
  const tenant = getCompanyFromCookie();
  const companyTitle = tenant === 'wadaana' ? 'Wadaana Industries' : 'AquaSphere';

  const [timeframe, setTimeframe] = useState('MONTHLY'); // 'MONTHLY', 'DAILY', 'YEARLY'

  const activeData = useMemo(() => {
    if (!data) return {};
    const tfKey = timeframe.toLowerCase();
    if (data[tfKey]) return data[tfKey];
    return {
      sales: Number(data.sales || 0),
      cash: Number(data.cash || 0),
      expenses: Number(data.expenses || 0),
      netCash: Number(data.netCash || (Number(data.cash || 0) - Number(data.expenses || 0))),
      purchases: Number(data.purchases || data.todaysPurchases || 0),
      purchasesCount: Number(data.purchasesCount || data.todaysPurchasesCount || 0),
      bottlesSold: Number(data.bottlesSold || 0)
    };
  }, [data, timeframe]);

  const netCash = Number(activeData.cash || 0) - Number(activeData.expenses || 0);

  const getPeriodLabel = () => {
    if (timeframe === 'DAILY') return "Today's";
    if (timeframe === 'YEARLY') return "This Year's";
    return "This Month's";
  };

  const getPeriodText = () => {
    if (timeframe === 'DAILY') return 'today';
    if (timeframe === 'YEARLY') return 'this year';
    return 'this month';
  };

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
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">{getPeriodLabel()} Net Cash Position</span>
            <div className={`text-2xl font-black font-mono ${netCash >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              Rs. {netCash.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 block font-medium">Cash Collected - Operating Expenses</span>
          </div>
        </div>
      </div>

      {/* ── 1. Executive Financial Overview Grid ────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Executive Financial Overview</h2>
          </div>

          {/* Time Horizon Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Timeframe:</span>
            <TimeframeDropdown value={timeframe} onChange={setTimeframe} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <DashboardKpiCard 
            icon={<Wallet />} 
            title={timeframe === 'DAILY' ? "TODAY'S SALES" : timeframe === 'YEARLY' ? "YEARLY SALES" : "MONTHLY SALES"} 
            value={`Rs. ${Number(activeData?.sales || 0).toLocaleString()}`} 
            subtitle={`${activeData?.bottlesSold || 0} orders ${getPeriodText()}`} 
            color="text-sky-600" 
            bg="bg-sky-50" 
            border="border-sky-100" 
          />
          <DashboardKpiCard 
            icon={<CreditCard />} 
            title="CASH COLLECTED" 
            value={`Rs. ${Number(activeData?.cash || 0).toLocaleString()}`} 
            subtitle={`Cash received ${getPeriodText()}`} 
            color="text-emerald-600" 
            bg="bg-emerald-50" 
            border="border-emerald-100" 
          />
          <DashboardKpiCard 
            icon={<Receipt />} 
            title={timeframe === 'DAILY' ? "EXPENSES TODAY" : timeframe === 'YEARLY' ? "YEARLY EXPENSES" : "MONTHLY EXPENSES"} 
            value={`Rs. ${Number(activeData?.expenses || 0).toLocaleString()}`} 
            subtitle="Logged operating cost" 
            color="text-rose-600" 
            bg="bg-rose-50" 
            border="border-rose-100" 
          />
          <DashboardKpiCard 
            icon={<Wallet />} 
            title="NET CASH" 
            value={`Rs. ${netCash.toLocaleString()}`} 
            subtitle="Cash - Expenses" 
            color={netCash >= 0 ? "text-emerald-700" : "text-rose-700"} 
            bg={netCash >= 0 ? "bg-emerald-50" : "bg-rose-50"} 
            border={netCash >= 0 ? "border-emerald-100" : "border-rose-100"} 
          />
          <DashboardKpiCard 
            icon={<ShoppingCart />} 
            title={timeframe === 'DAILY' ? "TODAY'S PURCHASES" : timeframe === 'YEARLY' ? "YEARLY PURCHASES" : "MONTHLY PURCHASES"} 
            value={`Rs. ${Number(activeData?.purchases || 0).toLocaleString()}`} 
            subtitle={`${activeData?.purchasesCount || 0} purchase logs`} 
            color="text-purple-600" 
            bg="bg-purple-50" 
            border="border-purple-100" 
          />
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
                Rs. {Number(data?.monthlyPurchases || data?.monthly?.purchases || 0).toLocaleString()}
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
