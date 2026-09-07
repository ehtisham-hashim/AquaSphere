import { useState, useEffect } from 'react';
import { CreditCard, Wallet, Receipt, ShoppingCart, TrendingUp, Clock, Lock } from 'lucide-react';
import ModernKpiCard from './ModernKpiCard';
import { useTenant } from '../../context/TenantContext';
import { API_URL } from '../../utils/api';

export default function AccountantDashboardView({ data }) {
  const { tenant, isWadaana } = useTenant();
  const companyTitle = isWadaana ? 'Wadaana Industries' : 'AquaSphere';

  const [closeStatus, setCloseStatus] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  const netCash = Number(data?.cash || 0) - Number(data?.expenses || 0);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchFinanceDetails = async () => {
      setLoadingExpenses(true);
      try {
        const [closeRes, expensesRes] = await Promise.all([
          fetch(`${API_URL}/daily-close/status?tenant=${tenant}`, { credentials: 'include' }),
          fetch(`${API_URL}/expenses?tenant=${tenant}&date=${today}`, { credentials: 'include' })
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
    <div className="space-y-6 pb-6">
      {/* Top Banner */}
      <div className="card-surface p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-brand">
              {companyTitle} • ACCOUNTS CONTROL
            </span>
            <span className="text-xs text-slate-400 font-medium">Daily Finance Ledger</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">Finance & Cash Ledger Overview</h1>
        </div>

        {closeStatus?.isClosed ? (
          <div className="badge-success px-3 py-1.5 text-xs font-bold">
            <Lock size={14} /> Day Closed
          </div>
        ) : (
          <div className="badge-brand px-3 py-1.5 text-xs font-bold">
            <Clock size={14} /> Day Open
          </div>
        )}
      </div>

      {/* 1. Financial & Cash Overview */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-slate-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Financial Summary</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <ModernKpiCard icon={CreditCard} title="Cash Collected" value={`Rs. ${Number(data?.cash || 0).toLocaleString()}`} subtitle="Cash received today" variant="emerald" />
          <ModernKpiCard icon={Wallet} title="Today's Sales" value={`Rs. ${Number(data?.sales || 0).toLocaleString()}`} subtitle="Total sales revenue" variant="sky" />
          <ModernKpiCard icon={CreditCard} title="Credit Sales" value={`Rs. ${Number(data?.credit || 0).toLocaleString()}`} subtitle="Billed on credit" variant="amber" />
          <ModernKpiCard icon={Receipt} title="Expenses Today" value={`Rs. ${Number(data?.expenses || 0).toLocaleString()}`} subtitle="Operating cost logged" variant="rose" />
          <ModernKpiCard icon={Wallet} title="Net Cash" value={`Rs. ${netCash.toLocaleString()}`} subtitle="Cash - Expenses" variant={netCash >= 0 ? "emerald" : "rose"} />
        </div>
      </section>

      {/* 2. Vendor Payables Summary */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Receipt size={18} className="text-slate-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Vendor Payables & Accounts Ledger</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <ModernKpiCard
            icon={Receipt}
            title="Pending Vendor Payables"
            value={`Rs. ${Number(data?.pendingVendorPayables || 0).toLocaleString()}`}
            subtitle="Total outstanding debt owed to suppliers"
            variant="rose"
          />
          <ModernKpiCard
            icon={ShoppingCart}
            title="Monthly Material Purchases"
            value={`Rs. ${Number(data?.monthlyPurchases || 0).toLocaleString()}`}
            subtitle="Raw material spend this month"
            variant="neutral"
          />
        </div>
      </section>

      {/* 3. Today's Logged Expenses Detail Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Today&apos;s Operating Expenses Breakdown</h2>
          <span className="text-xs text-slate-400 font-semibold">{expenses.length} records today</span>
        </div>

        <div className="table-container">
          {loadingExpenses ? (
            <div className="p-8 text-center text-xs text-slate-400 font-medium">Loading today&apos;s ledger...</div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-medium">No operating expenses recorded for today.</div>
          ) : (
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr>
                  <th className="table-th">Expense Category</th>
                  <th className="table-th">Description / Note</th>
                  <th className="table-th">Payment Method</th>
                  <th className="table-th">Logged By</th>
                  <th className="table-th text-right">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="table-td font-semibold text-slate-800">
                      <span className="badge-neutral">{item.category}</span>
                    </td>
                    <td className="table-td text-slate-600 max-w-xs truncate">{item.description || '—'}</td>
                    <td className="table-td text-slate-600 uppercase font-mono text-[10px]">{item.paymentMethod || 'CASH'}</td>
                    <td className="table-td text-slate-500">{item.recordedBy || 'Admin'}</td>
                    <td className="table-td text-right font-bold font-mono text-slate-900">
                      Rs. {Number(item.amount || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
