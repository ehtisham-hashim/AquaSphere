import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, Receipt, ShoppingCart, CreditCard, Sparkles, BarChart3, Fuel, Car, Clock, Users } from 'lucide-react';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import ModernKpiCard from './ModernKpiCard';
import PurchasingSummaryTab from './PurchasingSummaryTab';
import LowStockAlertGrid from './LowStockAlertGrid';
import UnprocessedOrdersModal from './UnprocessedOrdersModal';
import CustomerRiskHub from './CustomerRiskHub';
import ProductionScrapLossWidget from './production/ProductionScrapLossWidget';
import { useTenant } from '../../context/TenantContext';
import { useLiveEvent } from '../../context/SSEContext';
import { API_URL } from '../../utils/api';
import { TimeframeDropdown } from '../ui';
import ChartTooltip from './charts/ChartTooltip';
import { formatCompactCurrency, formatCurrency } from '../../utils/chartFormatters';

export default function OwnerDashboardView({ data, summary, summaryLoading }) {
  const navigate = useNavigate();
  const { tenant, isWadaana } = useTenant();
  const companyTitle = isWadaana ? 'Wadaana Industries' : 'AquaSphere';

  const [timeframe, setTimeframe] = useState('1_MONTH');
  const [showUnprocessedModal, setShowUnprocessedModal] = useState(false);

  const activeData = useMemo(() => {
    if (!data) return {};
    let tfKey;
    if (timeframe === 'TODAY' || timeframe === 'DAILY' || timeframe === 'YESTERDAY' || timeframe === 'LAST_3_DAYS' || timeframe === '1_WEEK') {
      tfKey = 'daily';
    } else if (timeframe === '1_YEAR' || timeframe === 'YEARLY') {
      tfKey = 'yearly';
    } else if (timeframe === '1_MONTH' || timeframe === 'MONTHLY') {
      tfKey = 'monthly';
    } else {
      tfKey = timeframe.toLowerCase();
    }
    const tf = data[tfKey] || (tfKey === 'monthly' ? (data.monthly || data) : data.daily || data);
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
      bottlesSold: Number(tf.bottlesSold ?? data.bottlesSold ?? 0),
      credit: Number(tf.credit ?? data.credit ?? 0),
      creditBilled: Number(tf.creditBilled ?? data.creditBilled ?? 0),
      waterLitres: Number(tf.waterLitres ?? data.waterLitres ?? 0),
      customWaterLitres: Number(tf.customWaterLitres ?? data.customWaterLitres ?? 0),
      refillWaterLitres: Number(tf.refillWaterLitres ?? data.refillWaterLitres ?? 0)
    };
  }, [data, timeframe]);

  const totalReceivables = Number(data?.totalOutstandingReceivables ?? data?.totalReceivables ?? 0);
  const netCash = Number(activeData.cash || 0) - Number(activeData.expenses || 0);

  const [transportData, setTransportData] = useState({ expenses: [], vehicleCount: 0, monthlySpend: 0, totalSpend: 0 });
  const [transportLoaded, setTransportLoaded] = useState(false);

  const fetchTransport = useCallback(async () => {
    try {
      const [expRes, vehRes] = await Promise.all([
        fetch(`${API_URL}/expenses?limit=200`, {
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
      if (expJson.success && vehJson.success) {
        const rawExps = expJson.data?.expenses || expJson.data || [];
        const exps = Array.isArray(rawExps) ? rawExps : [];
        const vehs = vehJson.data || [];

        const TRANSPORT_CATEGORIES = ['Fuel / Transport', 'Fuel', 'Vehicle Repairs', 'Vehicle Repair', 'Maintenance'];
        const transportExps = exps.filter(e =>
          TRANSPORT_CATEGORIES.includes(e.category) || Boolean(e.vehicleId)
        );

        const now = new Date();
        const curMonth = now.getMonth();
        const curYear = now.getFullYear();
        const monthlySpend = transportExps
          .filter((e) => {
            const d = new Date(e.date || e.createdAt);
            return d.getMonth() === curMonth && d.getFullYear() === curYear;
          })
          .reduce((sum, e) => sum + Number(e.amount || 0), 0);

        const totalSpend = transportExps.reduce((sum, e) => sum + Number(e.amount || 0), 0);

        setTransportData({
          expenses: transportExps,
          vehicleCount: vehs.length,
          monthlySpend,
          totalSpend
        });
        setTransportLoaded(true);
      }
    } catch (err) {
      console.error('Error fetching dashboard transport data', err);
    }
  }, [tenant]);

  useEffect(() => {
    fetchTransport();
  }, [fetchTransport]);

  useLiveEvent(['EXPENSE_LOGGED', 'VEHICLE_UPDATED'], fetchTransport);

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

  const getPeriodLabel = () => {
    if (timeframe === 'DAILY' || timeframe === 'TODAY') return "Today's";
    if (timeframe === 'YESTERDAY') return "Yesterday's";
    if (timeframe === 'LAST_3_DAYS') return "Last 3 Days'";
    if (timeframe === '1_WEEK') return "This Week's";
    if (timeframe === 'YEARLY' || timeframe === '1_YEAR') return "This Year's";
    return "This Month's";
  };

  const getPeriodText = () => {
    if (timeframe === 'DAILY' || timeframe === 'TODAY') return 'today';
    if (timeframe === 'YESTERDAY') return 'yesterday';
    if (timeframe === 'LAST_3_DAYS') return 'past 3 days';
    if (timeframe === '1_WEEK') return 'this week';
    if (timeframe === 'YEARLY' || timeframe === '1_YEAR') return 'this year';
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
            Sales, cash collections, operating expenses, and market balances.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <span className="text-xs text-slate-400">Timeframe:</span>
          <TimeframeDropdown value={timeframe} onChange={setTimeframe} />
        </div>
      </div>

      {/* 1. Executive Financial Overview Grid (4 Clean Flow Cards) */}
      <section className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <ModernKpiCard 
            icon={Wallet} 
            title={`${getPeriodLabel()} Sales`} 
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
            title="Cash Inflow" 
            value={`Rs. ${Number(activeData?.cash || 0).toLocaleString()}`} 
            subtitle={`Receivables: Rs. ${totalReceivables.toLocaleString()}`} 
            variant="emerald"
          />
          <ModernKpiCard 
            icon={Receipt} 
            title={`${getPeriodLabel()} Expenses`} 
            value={`Rs. ${Number(activeData?.expenses || 0).toLocaleString()}`} 
            subtitle="Logged operating cost" 
            variant="rose"
          />
          <ModernKpiCard 
            icon={Wallet} 
            title="Net Cash" 
            value={`Rs. ${netCash.toLocaleString()}`} 
            subtitle="Cash Inflow - Expenses" 
            variant={netCash >= 0 ? "emerald" : "rose"}
          />
        </div>

        {/* Outstanding Balances (Customer Market Udhaar & Supplier Payables) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          <ModernKpiCard
            icon={Users}
            title="Market Udhaar (Receivables)"
            value={`Rs. ${totalReceivables.toLocaleString()}`}
            subtitle="Customer unpaid orders & credit balance"
            variant="amber"
            onClick={() => navigate('/orders')}
          />
          <ModernKpiCard
            icon={ShoppingCart}
            title="Supplier Udhaar (Payables)"
            value={`Rs. ${Number(data?.pendingVendorPayables || 0).toLocaleString()}`}
            subtitle="Pending raw material supplier bills"
            variant="rose"
            onClick={() => navigate('/purchases')}
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

      {/* 2. Interactive Recharts Analytics (Full-width clean card) */}
      <div className="card-surface p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={17} className="text-slate-600" />
            <h3 className="font-bold text-slate-800 text-xs sm:text-sm uppercase tracking-wider">
              Sales, Cash Inflow & Profit Trajectory
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
              <Bar dataKey="Sales Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="Cash Inflow" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Line type="monotone" dataKey="Net Profit" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Operational Cockpit: 2-Column Split for high-density overview with minimal scrolling */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 pt-1">
        {/* Left Column (7 cols): Purchasing, Payables & Logistics */}
        <div className="lg:col-span-7 space-y-4">
          {/* Procurement Summary & Payables */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-slate-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Procurement & Payables</h3>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Pending Payables:</span>
                <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                  Rs. {Number(data?.pendingVendorPayables || 0).toLocaleString()}
                </span>
              </div>
            </div>
            <PurchasingSummaryTab summary={summary} loading={summaryLoading} />
          </div>

          {/* Transport & Fleet Status */}
          {transportLoaded && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Fuel size={16} className="text-brand" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Transport & Fleet Status</h3>
                </div>
                <Link
                  to="/transport?tab=fleet"
                  className="text-xs font-semibold text-brand flex items-center gap-1 hover:underline"
                >
                  View Fleet &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ModernKpiCard
                  icon={Car}
                  title="Active Fleet Size"
                  value={`${transportData.vehicleCount} Vehicles`}
                  subtitle="Operational delivery units"
                  variant="brand"
                  onClick={() => navigate('/transport?tab=fleet')}
                />
                <ModernKpiCard
                  icon={Fuel}
                  title="Total Transport Spend"
                  value={`Rs. ${Math.round(transportData.totalSpend).toLocaleString()}`}
                  subtitle={`Rs. ${Math.round(transportData.monthlySpend).toLocaleString()} this month • Click to view`}
                  variant="brand"
                  onClick={() => navigate('/transport?tab=expenses')}
                />
              </div>

              {/* Single Recent Transport Expense & View All Button */}
              {transportData.expenses.length > 0 && (
                <div className="space-y-2">
                  <div className="table-container overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead>
                        <tr>
                          <th className="table-th">Date</th>
                          <th className="table-th">Vehicle</th>
                          <th className="table-th">Category</th>
                          <th className="table-th">Amount</th>
                          <th className="table-th">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transportData.expenses.slice(0, 1).map((ex) => (
                          <tr key={ex.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="table-td text-slate-500">{new Date(ex.date || ex.createdAt).toLocaleDateString('en-GB')}</td>
                            <td className="table-td font-semibold text-slate-800">
                              {ex.vehicle?.name || 'General Fleet'} {ex.vehicle?.plateNumber && <span className="text-slate-400 font-mono font-normal">({ex.vehicle.plateNumber})</span>}
                            </td>
                            <td className="table-td">
                              <span className="badge-neutral">{ex.category}</span>
                            </td>
                            <td className="table-td font-bold font-mono text-slate-900">
                              Rs. {Math.round(Number(ex.amount)).toLocaleString()}
                            </td>
                            <td className="table-td text-slate-500 max-w-[160px] truncate">{ex.remarks || ex.description || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/transport?tab=expenses')}
                    className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-brand font-bold text-xs rounded-xl border border-slate-200/80 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>View All</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Plant Production Scrap & Inventory Health */}
        <div className="lg:col-span-5 space-y-4">
          {/* Low Stock Raw Material Warning (Alert) */}
          <LowStockAlertGrid count={data?.lowStockMaterialsCount} list={data?.lowStockMaterialsList} />

          {/* Production Scrap & Material Loss */}
          <ProductionScrapLossWidget timeframe={timeframe} />
        </div>
      </div>

      {/* Customer Risk & Bottle Intelligence Hub — Consolidated & Non-Bloated */}
      <CustomerRiskHub />

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
