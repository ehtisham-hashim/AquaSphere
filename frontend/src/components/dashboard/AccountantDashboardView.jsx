import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CreditCard, Wallet, Receipt, Lock, ShoppingCart, Users } from 'lucide-react';
import ModernKpiCard from './ModernKpiCard';
import CashBreakdownSection from './CashBreakdownSection';
import { useTenant } from '../../context/TenantContext';
import { API_URL } from '../../utils/api';
import { TimeframeDropdown } from '../ui';

export default function AccountantDashboardView({ data }) {
  const navigate = useNavigate();
  const { tenant, isWadaana } = useTenant();
  const companyTitle = isWadaana ? 'Wadaana Industries' : 'AquaSphere';

  const [timeframe, setTimeframe] = useState('TODAY');
  const [closeStatus, setCloseStatus] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  const activeData = useMemo(() => {
    if (!data) return {};
    let tfKey;
    if (timeframe === 'TODAY' || timeframe === 'DAILY') {
      tfKey = 'daily';
    } else if (timeframe === 'YESTERDAY') {
      tfKey = 'yesterday';
    } else if (timeframe === 'LAST_3_DAYS') {
      tfKey = 'last3Days';
    } else if (timeframe === '1_WEEK' || timeframe === 'WEEKLY') {
      tfKey = 'week';
    } else if (timeframe === '1_YEAR' || timeframe === 'YEARLY') {
      tfKey = 'yearly';
    } else if (timeframe === '1_MONTH' || timeframe === 'MONTHLY') {
      tfKey = 'monthly';
    } else {
      tfKey = timeframe.toLowerCase();
    }

    if (data[tfKey]) {
      const tf = data[tfKey];
      return {
        sales: Number(tf.sales ?? 0),
        cash: Number(tf.cash ?? 0),
        expenses: Number(tf.expenses ?? 0),
        vendorPayments: Number(tf.vendorPayments ?? 0),
        purchases: Number(tf.purchases ?? 0),
        netCashFlow: Number(tf.netCashFlow ?? ((Number(tf.cash ?? 0)) - (Number(tf.expenses ?? 0) + Number(tf.vendorPayments ?? 0)))),
        expectedDrawerCash: Number(tf.expectedDrawerCash ?? 0),
        credit: Number(tf.credit ?? 0),
        cashByMethod: tf.cashByMethod || { CASH: 0, BANK_TRANSFER: 0, EASYPAISA: 0, JAZZCASH: 0, CHEQUE: 0 },
        salesBySize: tf.salesBySize || { '19L': 0, '1.5L': 0, '0.5L': 0 },
        cashBySize: tf.cashBySize || { '19L': 0, '1.5L': 0, '0.5L': 0 }
      };
    }

    const tf = tfKey === 'monthly' ? (data.monthly || data) : (data.daily || data);
    const cashVal = Number(tf?.cash ?? data.cash ?? 0);
    const expVal = Number(tf?.expenses ?? data.expenses ?? 0);
    const vpVal = Number(tf?.vendorPayments ?? data.vendorPayments ?? 0);
    return {
      sales: Number(tf?.sales ?? data.sales ?? 0),
      cash: cashVal,
      expenses: expVal,
      vendorPayments: vpVal,
      purchases: Number(tf?.purchases ?? data.purchases ?? 0),
      netCashFlow: Number(tf?.netCashFlow ?? (cashVal - expVal - vpVal)),
      expectedDrawerCash: Number(tf?.expectedDrawerCash ?? 0),
      credit: Number(tf?.credit ?? data.credit ?? 0),
      cashByMethod: tf?.cashByMethod || data?.cashByMethod || { CASH: 0, BANK_TRANSFER: 0, EASYPAISA: 0, JAZZCASH: 0, CHEQUE: 0 },
      salesBySize: tf?.salesBySize || data?.salesBySize || { '19L': 0, '1.5L': 0, '0.5L': 0 },
      cashBySize: tf?.cashBySize || data?.cashBySize || { '19L': 0, '1.5L': 0, '0.5L': 0 }
    };
  }, [data, timeframe]);

  const netCashFlow = Number(activeData.netCashFlow ?? 0);
  const expectedDrawerCash = Number(activeData.expectedDrawerCash ?? 0);
  const totalReceivables = Number(data?.totalOutstandingReceivables ?? data?.totalReceivables ?? 0);

  const dateRange = useMemo(() => {
    const toLocalStr = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const now = new Date();
    const todayStr = toLocalStr(now);
    let startStr = todayStr;
    let endStr = todayStr;
    if (timeframe === 'YESTERDAY') {
      const d = new Date(now);
      d.setDate(now.getDate() - 1);
      startStr = toLocalStr(d);
      endStr = startStr;
    } else if (timeframe === 'LAST_3_DAYS') {
      const d = new Date(now);
      d.setDate(now.getDate() - 2);
      startStr = toLocalStr(d);
    } else if (timeframe === '1_WEEK' || timeframe === 'WEEKLY') {
      const d = new Date(now);
      d.setDate(now.getDate() - 6);
      startStr = toLocalStr(d);
    } else if (timeframe === '1_MONTH' || timeframe === 'MONTHLY') {
      startStr = toLocalStr(new Date(now.getFullYear(), now.getMonth(), 1));
    } else if (timeframe === '1_YEAR' || timeframe === 'YEARLY') {
      startStr = toLocalStr(new Date(now.getFullYear(), 0, 1));
    }
    return { todayStr, startStr, endStr };
  }, [timeframe]);

  useEffect(() => {
    let active = true;
    const fetchFinanceDetails = async () => {
      setLoadingExpenses(true);
      try {
        const [closeRes, expensesRes] = await Promise.all([
          fetch(`${API_URL}/daily-close/status?date=${dateRange.todayStr}&tenant=${tenant}`, { headers: { 'x-tenant': tenant }, credentials: 'include' }),
          fetch(`${API_URL}/expenses?startDate=${dateRange.startStr}&endDate=${dateRange.endStr}&tenant=${tenant}`, { headers: { 'x-tenant': tenant }, credentials: 'include' })
        ]);

        const closeData = await closeRes.json();
        const expensesData = await expensesRes.json();

        if (!active) return;
        setCloseStatus(closeData.data || { isClosed: false });
        setExpenses(Array.isArray(expensesData.data) ? expensesData.data : (expensesData.data?.expenses || []));
      } catch (err) {
        if (active) console.error('Error fetching accountant finance details:', err);
      } finally {
        if (active) setLoadingExpenses(false);
      }
    };

    fetchFinanceDetails();
    return () => {
      active = false;
    };
  }, [tenant, dateRange]);

  const getPeriodLabel = () => {
    if (timeframe === 'DAILY' || timeframe === 'TODAY') return 'Today';
    if (timeframe === 'YESTERDAY') return 'Yesterday';
    if (timeframe === 'LAST_3_DAYS') return 'Last 3 Days';
    if (timeframe === '1_WEEK' || timeframe === 'WEEKLY') return 'This Week';
    if (timeframe === '1_YEAR' || timeframe === 'YEARLY') return 'This Year';
    return 'This Month';
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Top Banner */}
      <div className="card-surface p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-brand">
              {companyTitle}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Daily Finance Ledger</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-1">Finance &amp; Cash Ledger</h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium">Timeframe:</span>
            <TimeframeDropdown value={timeframe} onChange={setTimeframe} />
          </div>

          <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />

          <Link
            to="/daily-close"
            className={`btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
              closeStatus?.isClosed 
                ? 'border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100' 
                : 'border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100'
            }`}
            title="Open Daily Close"
          >
            <Lock size={14} className={closeStatus?.isClosed ? "text-emerald-600" : "text-amber-600"} />
            <span>
              {closeStatus?.isClosed 
                ? 'Day Closed ✓' 
                : `Daily Close: [PM ${closeStatus?.pmConfirmed ? '✓' : '⏳'} MM ${closeStatus?.mmConfirmed ? '✓' : '⏳'} TM ${closeStatus?.tmConfirmed ? '✓' : '⏳'}]`}
            </span>
          </Link>
        </div>
      </div>

      {/* 1. Financial & Cash Flow Cards */}
      <section className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <ModernKpiCard
            icon={CreditCard}
            title={`${getPeriodLabel()} Cash Inflow`}
            value={`Rs. ${Number(activeData?.cash || 0).toLocaleString()}`}
            subtitle={`Drawer (Physical): Rs. ${expectedDrawerCash.toLocaleString()}`}
            variant="emerald"
          />
          <ModernKpiCard
            icon={Wallet}
            title={`${getPeriodLabel()} Sales`}
            value={`Rs. ${Number(activeData?.sales || 0).toLocaleString()}`}
            subtitle={`Credit: Rs. ${Number(activeData?.credit || 0).toLocaleString()}`}
            variant="sky"
          />
          <ModernKpiCard
            icon={Receipt}
            title={`${getPeriodLabel()} Outflows`}
            value={`Rs. ${Number((activeData?.expenses || 0) + (activeData?.vendorPayments || 0)).toLocaleString()}`}
            subtitle={`Expenses: Rs. ${Number(activeData?.expenses || 0).toLocaleString()} • Vendors: Rs. ${Number(activeData?.vendorPayments || 0).toLocaleString()}`}
            variant="rose"
          />
          <ModernKpiCard
            icon={Wallet}
            title={`${getPeriodLabel()} Net Cash Flow`}
            value={`Rs. ${netCashFlow.toLocaleString()}`}
            subtitle="Cash Inflow - Expenses - Vendor Paid"
            variant={netCashFlow >= 0 ? 'emerald' : 'rose'}
          />
        </div>

        {/* Payment Channels & Size Breakdown */}
        <CashBreakdownSection 
          cashByMethod={activeData?.cashByMethod} 
          salesBySize={activeData?.salesBySize} 
          cashBySize={activeData?.cashBySize} 
        />
      </section>

      {/* 2. Main Ledger & Accounts Workspace (2-Column Split for Zero-Scroll Efficiency) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Left Column (7 cols): Timeframe Operating Expenses Detail Table */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Receipt size={15} className="text-slate-500" />
              {getPeriodLabel()} Expense Log
            </h2>
            <span className="text-xs text-slate-400 font-semibold">{expenses.length} records</span>
          </div>

          <div className="table-container max-h-[380px] overflow-y-auto">
            {loadingExpenses ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">Loading ledger...</div>
            ) : expenses.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">No operating expenses recorded for {getPeriodLabel().toLowerCase()}.</div>
            ) : (
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs z-10">
                  <tr>
                    <th className="table-th">Category</th>
                    <th className="table-th">Note</th>
                    <th className="table-th">Method</th>
                    <th className="table-th">By</th>
                    <th className="table-th text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="table-td font-semibold text-slate-800">
                        <span className="badge-neutral">{item.category}</span>
                      </td>
                      <td className="table-td text-slate-600 max-w-[180px] truncate">{item.remarks || '—'}</td>
                      <td className="table-td text-slate-600 uppercase font-mono text-[10px]">{item.isPurchase ? (item.paymentStatus || 'PURCHASE') : (item.paymentMethod || 'EXPENSE')}</td>
                      <td className="table-td text-slate-500">{item.createdBy?.name || 'Staff'}</td>
                      <td className="table-td text-right font-bold font-mono text-slate-900">
                        Rs. {Number(item.amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Accounts Ledger & Outstanding Balances */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="flex items-center gap-1.5">
            <CreditCard size={15} className="text-slate-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Accounts &amp; Payables Ledger</h2>
          </div>

          <div className="space-y-3">
            <ModernKpiCard
              icon={Users}
              title="Customer Receivables"
              value={`Rs. ${totalReceivables.toLocaleString()}`}
              subtitle="All-time unpaid customer credit (Click to manage)"
              variant="amber"
              onClick={() => navigate('/orders')}
            />
            <ModernKpiCard
              icon={ShoppingCart}
              title="Pending Vendor Payables"
              value={`Rs. ${Number(data?.pendingVendorPayables || 0).toLocaleString()}`}
              subtitle="Outstanding supplier purchases (Click to settle)"
              variant="rose"
              onClick={() => navigate('/purchases')}
            />
            <ModernKpiCard
              icon={Receipt}
              title={`${getPeriodLabel()} Material Purchases`}
              value={`Rs. ${Number(activeData?.purchases || 0).toLocaleString()}`}
              subtitle={`Raw material invoices (${getPeriodLabel().toLowerCase()})`}
              variant="neutral"
              onClick={() => navigate('/purchases')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
