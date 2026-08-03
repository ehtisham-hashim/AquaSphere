import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, CreditCard, Receipt, ShoppingCart, Lock, Clock, AlertCircle } from 'lucide-react';
import DashboardKpiCard from './DashboardKpiCard';
import PurchasingSummaryTab from './PurchasingSummaryTab';
import { getCompanyFromCookie } from '../../utils/companyCookie';
import { API_URL as API } from '../../utils/api';

export default function AccountantDashboardView({ data, summary, summaryLoading }) {
  const tenant = getCompanyFromCookie();
  const companyTitle = tenant === 'wadaana' ? 'Wadaana Industries' : 'AquaSphere';
  const netCash = Number(data?.cash || 0) - Number(data?.expenses || 0);

  const [expenses, setExpenses] = useState([]);
  const [closeStatus, setCloseStatus] = useState(null);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchFinanceDetails = async () => {
      setLoadingExpenses(true);
      try {
        const headers = { 'x-tenant': tenant };
        const [closeRes, expensesRes] = await Promise.all([
          fetch(`${API}/daily-close/status?date=${today}&tenant=${tenant}`, { headers, credentials: 'include' }),
          fetch(`${API}/expenses?startDate=${today}&endDate=${today}&tenant=${tenant}`, { headers, credentials: 'include' })
        ]);

        const closeData = await closeRes.json();
        const expensesData = await expensesRes.json();

        setCloseStatus(closeData.data || { isClosed: false });
        setExpenses(expensesData.data || []);
      } catch (err) {
        console.error('Error fetching accountant finance details:', err);
      } finally {
        setLoadingExpenses(false);
      }
    };

    fetchFinanceDetails();
  }, [tenant, today]);

  return (
    <div className="space-y-8 p-2 max-w-[98%] mx-auto pb-10">
      {/* Top Banner */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              {companyTitle} • ACCOUNTS
            </span>
            <span className="text-xs text-slate-500 font-medium">Finance & Cash Control View</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight mt-1">Finance & Cash Ledger Overview</h1>
        </div>

        {closeStatus?.isClosed ? (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold">
            <Lock size={16} /> Day Closed
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-xs font-bold">
            <Clock size={16} /> Day Open
          </div>
        )}
      </div>

      {/* 1. Financial & Cash Overview */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Today&apos;s Financial Summary</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <DashboardKpiCard icon={<CreditCard />} title="CASH COLLECTED" value={`Rs. ${Number(data?.cash || 0).toLocaleString()}`} subtitle="Cash received today" color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-100" />
          <DashboardKpiCard icon={<Wallet />} title="TODAY'S SALES" value={`Rs. ${Number(data?.sales || 0).toLocaleString()}`} subtitle="Total sales revenue" color="text-sky-600" bg="bg-sky-50" border="border-sky-100" />
          <DashboardKpiCard icon={<CreditCard />} title="CREDIT SALES" value={`Rs. ${Number(data?.credit || 0).toLocaleString()}`} subtitle="Billed on credit" color="text-orange-600" bg="bg-orange-50" border="border-orange-100" />
          <DashboardKpiCard icon={<Receipt />} title="EXPENSES TODAY" value={`Rs. ${Number(data?.expenses || 0).toLocaleString()}`} subtitle="Logged operating cost" color="text-rose-600" bg="bg-rose-50" border="border-rose-100" />
          <DashboardKpiCard icon={<Wallet />} title="NET CASH" value={`Rs. ${netCash.toLocaleString()}`} subtitle="Cash Collected - Expenses" color={netCash >= 0 ? "text-emerald-700" : "text-rose-700"} bg={netCash >= 0 ? "bg-emerald-50" : "bg-rose-50"} border={netCash >= 0 ? "border-emerald-100" : "border-rose-100"} />
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
              <p className="text-3xl font-black text-rose-600 font-mono">
                Rs. {Number(data?.pendingVendorPayables || 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">Total outstanding debt owed to suppliers.</p>
            </div>
            <div className="bg-rose-50 text-rose-500 p-4 rounded-full"><Receipt size={32} /></div>
          </div>

          <div className="bg-white border border-purple-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Monthly Material Purchases</h4>
              <p className="text-3xl font-black text-slate-800 font-mono">
                Rs. {Number(data?.monthlyPurchases || 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">Raw material spend this month.</p>
            </div>
            <div className="bg-purple-50 text-purple-600 p-4 rounded-full"><ShoppingCart size={32} /></div>
          </div>
        </div>
      </section>

      {/* 3. Today's Expenses Breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-rose-500" />
            <h3 className="font-bold text-slate-800 text-sm">Today&apos;s Logged Expenses</h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {expenses.length} entries — Total: Rs. {Number(data?.expenses || 0).toLocaleString()}
          </span>
        </div>
        {loadingExpenses ? (
          <div className="p-6 text-center text-xs text-slate-400">Loading expense logs...</div>
        ) : expenses.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <AlertCircle size={24} className="mx-auto mb-2 opacity-40 text-slate-400" />
            No expenses logged today
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Remarks</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-bold text-slate-700">{e.category}</td>
                    <td className="px-4 py-2.5 text-slate-500">{e.remarks || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-black text-rose-600 font-mono">
                      Rs. {parseFloat(e.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {e.receiptUrl ? (
                        <a href={e.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline font-bold">
                          View Receipt
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400">No Receipt</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Purchasing & Vendor Ledgers */}
      <PurchasingSummaryTab summary={summary} loading={summaryLoading} />
    </div>
  );
}
