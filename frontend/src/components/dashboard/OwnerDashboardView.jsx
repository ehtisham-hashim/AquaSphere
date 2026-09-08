import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, TrendingUp, Receipt, ShoppingCart, CreditCard, Sparkles, PieChart as PieIcon, BarChart3, Fuel, Car, ArrowRight, Clock } from 'lucide-react';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import ModernKpiCard from './ModernKpiCard';
import PurchasingSummaryTab from './PurchasingSummaryTab';
import LowStockAlertGrid from './LowStockAlertGrid';
import UnprocessedOrdersModal from './UnprocessedOrdersModal';
import { useTenant } from '../../context/TenantContext';
import { API_URL } from '../../utils/api';
import { TimeframeDropdown } from '../ui';
import ChartTooltip from './charts/ChartTooltip';
import { formatCompactCurrency, formatCurrency } from '../../utils/chartFormatters';

const COST_COLORS = ['#f43f5e', '#8b5cf6'];
const REVENUE_COLORS = ['#10b981', '#0284c7'];

export default function OwnerDashboardView({ data, summary, summaryLoading }) {
  const { tenant, isWadaana } = useTenant();
  const companyTitle = isWadaana ? 'Wadaana Industries' : 'AquaSphere';

  const [timeframe, setTimeframe] = useState('MONTHLY');
  const [showUnprocessedModal, setShowUnprocessedModal] = useState(false);

  const activeData = useMemo(() => {
    if (!data) return {};
    const tfKey = timeframe.toLowerCase();
    const tf = data[tfKey] || {};
    return {
      sales: Number(tf.sales ?? data.sales ?? 0),
      deliveredSales: Number(tf.deliveredSales ?? data.deliveredSales ?? 0),
      unprocessedSales: Number(tf.unprocessedSales ?? data.unprocessedSales ?? 0),
      unprocessedOrdersCount: Number(tf.unprocessedOrdersCount ?? data.unprocessedOrdersCount ?? 0),
      cash: Number(tf.cash ?? data.cash ?? 0),
      expenses: Number(tf.expenses ?? data.expenses ?? 0),
      netCash: Number(tf.netCash ?? (Number(tf.cash ?? data.cash ?? 0) - Number(tf.expenses ?? data.expenses ?? 0))),
      purchases: Number(tf.purchases ?? data.purchases ?? data.monthlyPurchases ?? data.todaysPurchases ?? 0),
      purchasesCount: Number(tf.purchasesCount ?? data.purchasesCount ?? data.todaysPurchasesCount ?? 0),
      bottlesSold: Number(tf.bottlesSold ?? data.bottlesSold ?? 0)
    };
  }, [data, timeframe]);

  const netCash = Number(activeData.cash || 0) - Number(activeData.expenses || 0);

  const [transportData, setTransportData] = useState({ expenses: [], vehicleCount: 0, monthlySpend: 0 });
  const [transportLoaded, setTransportLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchTransport() {
      try {
        const [expRes, vehRes] = await Promise.all([
          fetch(`${API_URL}/transport-expenses?limit=5`, {
            headers: { 'x-tenant': tenant },
            credentials: 'include'
          }),
          fetch(`${API_URL}/vehicles`, {
            headers: { 'x-tenant': tenant },
            credentials: 'include'
          })
        ]);
        const expJson = await expRes.json();
        const vehJson = await vehRes.json();
        if (isMounted && expJson.success && vehJson.success) {
          const exps = expJson.data || [];
          const vehs = vehJson.data || [];
          const now = new Date();
          const curMonth = now.getMonth();
          const curYear = now.getFullYear();
          const monthlySpend = exps
            .filter((e) => {
              const d = new Date(e.date || e.createdAt);
              return d.getMonth() === curMonth && d.getFullYear() === curYear;
            })
            .reduce((sum, e) => sum + Number(e.amount || 0), 0);

          setTransportData({
            expenses: exps,
            vehicleCount: vehs.length,
            monthlySpend
          });
          setTransportLoaded(true);
        }
      } catch (err) {
        console.error('Error fetching dashboard transport data', err);
      }
    }
    fetchTransport();
    return () => {
      isMounted = false;
    };
  }, [tenant]);

  const [chartTimeframe, setChartTimeframe] = useState('7');

  const trendData = useMemo(() => {
    if (!data) return [];
    if (chartTimeframe === '12m') {
      const trend = data.monthlyTrend || [];
      return trend.map(m => ({
        label: m.month,
        'Sales Revenue': Number(m.sales || 0),
        'Cash Inflow': Number(m.cash || 0),
        Expenses: Number(m.expenses || 0),
        'Net Profit': Number(m.netCash || 0)
      }));
    } else {
      const history = data.dailySalesHistory || [];
      const daysNum = parseInt(chartTimeframe, 10) || 7;
      const sliced = history.slice(-daysNum);
      return sliced.map(d => ({
        label: daysNum > 14 ? d.date?.substring(5) : d.day,
        Date: d.date,
        'Sales Revenue': Number(d.sales || 0),
        'Cash Inflow': Number(d.cashCollected || 0),
        Expenses: Number(d.expenses || 0),
        'Net Profit': Number(d.netCash || 0)
      }));
    }
  }, [data, chartTimeframe]);

  const costBreakdownData = useMemo(() => {
    const expensesVal = Number(activeData.expenses || 0);
    const purchasesVal = Number(activeData.purchases || 0);
    if (expensesVal === 0 && purchasesVal === 0) return [];
    return [
      { name: 'Operating Expenses', value: expensesVal },
      { name: 'Material Purchases', value: purchasesVal }
    ];
  }, [activeData]);

  const totalCost = (Number(activeData.expenses || 0) + Number(activeData.purchases || 0));

  const revenueStreamData = useMemo(() => {
    const orderCashVal = Number(activeData.orderCash || (activeData.cash * 0.7) || 0);
    const spotCashVal = Number(activeData.spotSalesCash || (activeData.cash * 0.3) || 0);
    if (orderCashVal === 0 && spotCashVal === 0) return [];
    return [
      { name: 'Order Collections', value: orderCashVal },
      { name: 'Spot Counter Sales', value: spotCashVal }
    ];
  }, [activeData]);

  const totalRevenue = Number(activeData.cash || 0);

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
    <div className="space-y-4 pb-6">
      {/* Top Action Header */}
      <div className="card-surface p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-brand">
              <Sparkles size={11} />
              {companyTitle}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Executive Overview</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold mt-1 tracking-tight text-slate-900">
            Operations & Financials
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-normal">
            Real-time overview of sales revenue, cash inflow, operating expenses, and inventory health.
          </p>
        </div>

        {/* Primary High-Level Metric Badge */}
        <div className="bg-slate-50/80 border border-slate-200/80 px-3.5 py-2.5 rounded-xl flex items-center gap-3 shrink-0">
          <div className={`p-2 rounded-lg shrink-0 ${netCash >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            <Wallet size={18} />
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{getPeriodLabel()} Net Cash</span>
            <div className={`text-base sm:text-lg font-bold font-mono tracking-tight ${netCash >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              Rs. {netCash.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 1. Executive Financial Overview Grid */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-slate-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">Financial Snapshot</h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Timeframe:</span>
            <TimeframeDropdown value={timeframe} onChange={setTimeframe} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <ModernKpiCard 
            icon={Wallet} 
            title={timeframe === 'DAILY' ? "Today's Sales" : timeframe === 'YEARLY' ? "Yearly Sales" : "Monthly Sales"} 
            value={`Rs. ${Number(activeData?.sales || 0).toLocaleString()}`} 
            subtitle={
              activeData?.unprocessedOrdersCount > 0
                ? `${activeData.unprocessedOrdersCount} pending (Rs. ${Number(activeData.unprocessedSales || 0).toLocaleString()})`
                : `${activeData?.bottlesSold || 0} orders ${getPeriodText()}`
            } 
            variant="sky"
            onClick={activeData?.unprocessedOrdersCount > 0 ? () => setShowUnprocessedModal(true) : undefined}
          />
          <ModernKpiCard 
            icon={CreditCard} 
            title="Cash Collected" 
            value={`Rs. ${Number(activeData?.cash || 0).toLocaleString()}`} 
            subtitle={`Received ${getPeriodText()}`} 
            variant="emerald"
          />
          <ModernKpiCard 
            icon={Receipt} 
            title={timeframe === 'DAILY' ? "Expenses Today" : timeframe === 'YEARLY' ? "Yearly Expenses" : "Monthly Expenses"} 
            value={`Rs. ${Number(activeData?.expenses || 0).toLocaleString()}`} 
            subtitle="Logged operating cost" 
            variant="rose"
          />
          <ModernKpiCard 
            icon={Wallet} 
            title="Net Cash" 
            value={`Rs. ${netCash.toLocaleString()}`} 
            subtitle="Cash - Expenses" 
            variant={netCash >= 0 ? "emerald" : "rose"}
          />
          <ModernKpiCard 
            icon={ShoppingCart} 
            title={timeframe === 'DAILY' ? "Today's Purchases" : timeframe === 'YEARLY' ? "Yearly Purchases" : "Monthly Purchases"} 
            value={`Rs. ${Number(activeData?.purchases || 0).toLocaleString()}`} 
            subtitle={`${activeData?.purchasesCount || 0} purchase logs`} 
            variant="neutral"
          />
        </div>

        {/* Unprocessed / Pending Orders Operational Alert */}
        {activeData?.unprocessedOrdersCount > 0 && (
          <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                <Clock size={15} />
              </span>
              <span className="text-amber-900 font-medium">
                <strong className="font-bold">{activeData.unprocessedOrdersCount} order(s)</strong> worth{' '}
                <strong className="font-bold font-mono">Rs. {Number(activeData.unprocessedSales || 0).toLocaleString()}</strong> are pending delivery.
                <span className="text-amber-700 text-[11px] ml-1.5 hidden md:inline">
                  (Delivered Realized Sales: Rs. {Number(activeData.deliveredSales || 0).toLocaleString()})
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowUnprocessedModal(true)}
              className="text-amber-800 font-bold hover:underline flex items-center gap-1 cursor-pointer shrink-0 text-xs self-end sm:self-center"
            >
              View Unprocessed Orders &rarr;
            </button>
          </div>
        )}
      </section>

      {/* 2. Interactive Recharts Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        
        {/* Main Financial Trend Chart (8 Cols) */}
        <div className="lg:col-span-8 card-surface p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={17} className="text-slate-600" />
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm uppercase tracking-wider">
                Financial Growth & Profitability Trajectory
              </h3>
            </div>
            <select
              value={chartTimeframe}
              onChange={(e) => setChartTimeframe(e.target.value)}
              className="select-base text-xs py-1 px-2.5 w-auto cursor-pointer"
            >
              <option value="7">Past 7 Days</option>
              <option value="14">Past 14 Days</option>
              <option value="30">Past 30 Days</option>
              <option value="12m">Past 12 Months</option>
            </select>
          </div>

          <div className="w-full h-64 sm:h-72 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 10, right: 12, left: 16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatCompactCurrency} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip formatter={formatCurrency} />} />
                <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px', fontWeight: 600 }} iconType="circle" />
                <Bar dataKey="Sales Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Cash Inflow" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line type="monotone" dataKey="Net Profit" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost & Revenue Breakdown Donuts (4 Cols) */}
        <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          
          {/* Operating Cost Breakdown Donut */}
          <div className="card-surface p-4 space-y-2 flex flex-col justify-between">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <PieIcon size={15} className="text-slate-600" />
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Costs Breakdown</h3>
            </div>
            {costBreakdownData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-slate-400 font-medium">
                No cost entries recorded.
              </div>
            ) : (
              <div className="relative w-full h-44 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={costBreakdownData} innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                      {costBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COST_COLORS[index % COST_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip formatter={formatCurrency} />} />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 600 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total</span>
                  <span className="text-xs font-bold text-slate-900 font-mono">{formatCompactCurrency(totalCost)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Revenue Stream Breakdown Donut */}
          <div className="card-surface p-4 space-y-2 flex flex-col justify-between">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <PieIcon size={15} className="text-slate-600" />
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Revenue Distribution</h3>
            </div>
            {revenueStreamData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-slate-400 font-medium">
                No revenue entries recorded.
              </div>
            ) : (
              <div className="relative w-full h-44 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={revenueStreamData} innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                      {revenueStreamData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={REVENUE_COLORS[index % REVENUE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip formatter={formatCurrency} />} />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 600 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Cash</span>
                  <span className="text-xs font-bold text-slate-900 font-mono">{formatCompactCurrency(totalRevenue)}</span>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* 3. Purchasing & Vendor Payables Cards */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} className="text-slate-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Procurement & Payables</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <ModernKpiCard
            icon={ShoppingCart}
            title="Monthly Purchases Total"
            value={`Rs. ${Number(data?.monthlyPurchases || data?.monthly?.purchases || 0).toLocaleString()}`}
            subtitle="Raw material spend this month"
            variant="neutral"
          />
          <ModernKpiCard
            icon={Receipt}
            title="Pending Vendor Payables"
            value={`Rs. ${Number(data?.pendingVendorPayables || 0).toLocaleString()}`}
            subtitle="Outstanding supplier debt"
            variant="rose"
          />
        </div>
      </section>

      {/* 4. Low Stock Raw Material Warning */}
      <LowStockAlertGrid count={data?.lowStockMaterialsCount} list={data?.lowStockMaterialsList} />

      {/* 5. Purchasing & Vendor Summary */}
      <PurchasingSummaryTab summary={summary} loading={summaryLoading} />

      {/* 6. Transport & Logistics Summary */}
      {transportLoaded && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fuel size={18} className="text-brand" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Transport & Fleet Status</h2>
            </div>
            <Link
              to="/transport-expenses"
              className="text-xs font-semibold text-brand flex items-center gap-1 hover:underline"
            >
              View Fleet <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <ModernKpiCard
              icon={Car}
              title="Active Fleet Size"
              value={`${transportData.vehicleCount} Vehicles`}
              subtitle="Operational delivery units"
              variant="brand"
            />
            <ModernKpiCard
              icon={Fuel}
              title="Recent Transport Spend"
              value={`Rs. ${Math.round(transportData.monthlySpend).toLocaleString()}`}
              subtitle="Fuel & maintenance this month"
              variant="brand"
            />
          </div>

          {/* Transport Expenses Table */}
          {transportData.expenses.length > 0 && (
            <div className="table-container">
              <div className="card-header bg-slate-50/70">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Recent Vehicle Expenses</span>
              </div>
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="table-th">Date</th>
                    <th className="table-th">Vehicle</th>
                    <th className="table-th">Type</th>
                    <th className="table-th">Amount</th>
                    <th className="table-th">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {transportData.expenses.slice(0, 5).map((ex) => (
                    <tr key={ex.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="table-td text-slate-500">{new Date(ex.date || ex.createdAt).toLocaleDateString()}</td>
                      <td className="table-td font-semibold text-slate-800">
                        {ex.vehicle?.name || '—'} <span className="text-slate-400 font-mono font-normal">({ex.vehicle?.plateNumber})</span>
                      </td>
                      <td className="table-td">
                        <span className="badge-neutral">{ex.type}</span>
                      </td>
                      <td className="table-td font-bold font-mono text-slate-900">
                        Rs. {Math.round(Number(ex.amount)).toLocaleString()}
                      </td>
                      <td className="table-td text-slate-500 max-w-[200px] truncate">{ex.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Unprocessed Orders Modal */}
      <UnprocessedOrdersModal
        isOpen={showUnprocessedModal}
        onClose={() => setShowUnprocessedModal(false)}
        unprocessedOrders={data?.unprocessedOrders || []}
        timeframeLabel={getPeriodLabel()}
        totalSales={activeData.sales}
        deliveredSales={activeData.deliveredSales}
        unprocessedSales={activeData.unprocessedSales}
      />
    </div>
  );
}
