import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, Receipt, ShoppingCart, CreditCard, Sparkles, BarChart3, Fuel, Car, Users } from 'lucide-react';
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
import CashBreakdownSection from './CashBreakdownSection';
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
        netSalesExGst: Number(tf.netSalesExGst ?? tf.sales ?? 0),
        deliveredSales: Number(tf.deliveredSales ?? 0),
        unprocessedSales: Number(tf.unprocessedSales ?? 0),
        unprocessedOrdersCount: Number(tf.unprocessedOrdersCount ?? 0),
        cash: Number(tf.cash ?? 0),
        expenses: Number(tf.expenses ?? 0),
        transportExpenses: Number(tf.transportExpenses ?? 0),
        generalExpenses: Number(tf.generalExpenses ?? 0),
        purchases: Number(tf.purchases ?? 0),
        purchasesCount: Number(tf.purchasesCount ?? 0),
        vendorPayments: Number(tf.vendorPayments ?? 0),
        estimatedCogs: Number(tf.estimatedCogs ?? 0),
        grossProfit: Number(tf.grossProfit ?? 0),
        grossMarginPct: Number(tf.grossMarginPct ?? 0),
        operatingProfit: Number(tf.operatingProfit ?? 0),
        netCashFlow: Number(tf.netCashFlow ?? ((Number(tf.cash ?? 0)) - (Number(tf.expenses ?? 0) + Number(tf.vendorPayments ?? 0)))),
        expectedDrawerCash: Number(tf.expectedDrawerCash ?? 0),
        ordersCount: Number(tf.ordersCount ?? tf.bottlesSold ?? 0),
        bottlesSold: Number(tf.bottlesSold ?? 0),
        credit: Number(tf.credit ?? 0),
        creditBilled: Number(tf.creditBilled ?? 0),
        waterLitres: Number(tf.waterLitres ?? 0),
        customWaterLitres: Number(tf.customWaterLitres ?? 0),
        refillWaterLitres: Number(tf.refillWaterLitres ?? 0),
        cashByMethod: tf.cashByMethod || { CASH: 0, BANK_TRANSFER: 0, EASYPAISA: 0, JAZZCASH: 0, CHEQUE: 0 },
        salesBySize: tf.salesBySize || { '19L': 0, '1.5L': 0, '0.5L': 0 },
        cashBySize: tf.cashBySize || { '19L': 0, '1.5L': 0, '0.5L': 0 }
      };
    }

    const tf = tfKey === 'monthly' ? (data.monthly || data) : (data.daily || data);
    const cashVal = Number(tf.cash ?? data.cash ?? 0);
    const expVal = Number(tf.expenses ?? data.expenses ?? 0);
    const vpVal = Number(tf.vendorPayments ?? data.vendorPayments ?? 0);
    return {
      sales: Number(tf.sales ?? data.sales ?? 0),
      netSalesExGst: Number(tf.netSalesExGst ?? tf.sales ?? data.sales ?? 0),
      deliveredSales: Number(tf.deliveredSales ?? data.deliveredSales ?? 0),
      unprocessedSales: Number(tf.unprocessedSales ?? data.unprocessedSales ?? 0),
      unprocessedOrdersCount: Number(tf.unprocessedOrdersCount ?? data.unprocessedOrdersCount ?? 0),
      cash: cashVal,
      expenses: expVal,
      transportExpenses: Number(tf.transportExpenses ?? 0),
      generalExpenses: Number(tf.generalExpenses ?? 0),
      purchases: Number(tf.purchases ?? data.purchases ?? 0),
      purchasesCount: Number(tf.purchasesCount ?? data.purchasesCount ?? 0),
      vendorPayments: vpVal,
      estimatedCogs: Number(tf.estimatedCogs ?? 0),
      grossProfit: Number(tf.grossProfit ?? 0),
      grossMarginPct: Number(tf.grossMarginPct ?? 0),
      operatingProfit: Number(tf.operatingProfit ?? 0),
      netCashFlow: Number(tf.netCashFlow ?? (cashVal - expVal - vpVal)),
      expectedDrawerCash: Number(tf.expectedDrawerCash ?? 0),
      ordersCount: Number(tf.ordersCount ?? tf.bottlesSold ?? data.bottlesSold ?? 0),
      bottlesSold: Number(tf.bottlesSold ?? data.bottlesSold ?? 0),
      credit: Number(tf.credit ?? data.credit ?? 0),
      creditBilled: Number(tf.creditBilled ?? data.creditBilled ?? 0),
      waterLitres: Number(tf.waterLitres ?? data.waterLitres ?? 0),
      customWaterLitres: Number(tf.customWaterLitres ?? data.customWaterLitres ?? 0),
      refillWaterLitres: Number(tf.refillWaterLitres ?? data.refillWaterLitres ?? 0),
      cashByMethod: tf?.cashByMethod || data?.cashByMethod || { CASH: 0, BANK_TRANSFER: 0, EASYPAISA: 0, JAZZCASH: 0, CHEQUE: 0 },
      salesBySize: tf?.salesBySize || data?.salesBySize || { '19L': 0, '1.5L': 0, '0.5L': 0 },
      cashBySize: tf?.cashBySize || data?.cashBySize || { '19L': 0, '1.5L': 0, '0.5L': 0 }
    };
  }, [data, timeframe]);

  const totalReceivables = Number(data?.totalOutstandingReceivables ?? data?.totalReceivables ?? 0);
  const operatingProfit = Number(activeData.operatingProfit ?? 0);

  const [vehicleCount, setVehicleCount] = useState(0);
  const [fleetLoaded, setFleetLoaded] = useState(false);

  const fetchFleet = useCallback(async () => {
    try {
      const vehRes = await fetch(`${API_URL}/vehicles`, {
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const vehJson = await vehRes.json();
      if (vehJson.success) {
        const vehs = vehJson.data || [];
        setVehicleCount(vehs.length);
        setFleetLoaded(true);
      }
    } catch (err) {
      console.error('Error fetching dashboard fleet count', err);
    }
  }, [tenant]);

  useEffect(() => {
    fetchFleet();
  }, [fetchFleet]);

  useLiveEvent(['VEHICLE_UPDATED'], fetchFleet);

  const [chartTimeframe, setChartTimeframe] = useState('7');
  const [chartMode, setChartMode] = useState('profit'); // 'profit' | 'cash'

  const trendData = useMemo(() => {
    if (!data) return [];
    if (chartTimeframe === '12m') {
      const trend = data.monthlyTrend || [];
      return trend.map(m => chartMode === 'profit' ? ({
        label: m.month,
        'Net Sales (Ex-GST)': Number(m.netSalesExGst ?? m.sales ?? 0),
        'Estimated COGS': Number(m.estimatedCogs || 0),
        'Operating Expenses': Number(m.expenses || 0),
        'Operating Profit': Number(m.operatingProfit || 0)
      }) : ({
        label: m.month,
        'Cash Inflow': Number(m.cash || 0),
        'Expenses + Vendor Paid': Number(m.expenses || 0) + Number(m.vendorPayments || 0),
        'Material Purchases': Number(m.purchases || 0),
        'Net Cash Flow': Number(m.netCashFlow ?? m.netCash ?? 0)
      }));
    } else {
      const history = data.dailySalesHistory || [];
      const daysNum = parseInt(chartTimeframe, 10) || 7;
      const sliced = history.slice(-daysNum);
      return sliced.map(d => chartMode === 'profit' ? ({
        label: daysNum > 14 ? d.date?.substring(5) : d.day,
        Date: d.date,
        'Net Sales (Ex-GST)': Number(d.netSalesExGst ?? d.sales ?? 0),
        'Estimated COGS': Number(d.estimatedCogs || 0),
        'Operating Expenses': Number(d.expenses || 0),
        'Operating Profit': Number(d.operatingProfit || 0)
      }) : ({
        label: daysNum > 14 ? d.date?.substring(5) : d.day,
        Date: d.date,
        'Cash Inflow': Number(d.cashCollected || 0),
        'Expenses + Vendor Paid': Number(d.expenses || 0) + Number(d.vendorPayments || 0),
        'Material Purchases': Number(d.purchases || 0),
        'Net Cash Flow': Number(d.netCashFlow ?? d.netCash ?? 0)
      }));
    }
  }, [data, chartTimeframe, chartMode]);

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
            Operations &amp; Financials
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-normal">
            Sales, COGS profitability, cash drawer, operating expenses, and market balances.
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
                ? `Ex-GST: Rs. ${Number(activeData.netSalesExGst || 0).toLocaleString()} • ${activeData.unprocessedOrdersCount} pending`
                : `Ex-GST: Rs. ${Number(activeData.netSalesExGst || 0).toLocaleString()} • ${activeData?.ordersCount || 0} orders`
            } 
            variant="sky"
            onClick={activeData?.unprocessedOrdersCount > 0 ? () => setShowUnprocessedModal(true) : undefined}
          />
          <ModernKpiCard 
            icon={CreditCard} 
            title={`${getPeriodLabel()} Cash Inflow`} 
            value={`Rs. ${Number(activeData?.cash || 0).toLocaleString()}`} 
            subtitle={`Expected Drawer (Cash): Rs. ${Number(activeData?.expectedDrawerCash || 0).toLocaleString()}`} 
            variant="emerald"
          />
          <ModernKpiCard 
            icon={Receipt} 
            title={`${getPeriodLabel()} Operating Expenses`} 
            value={`Rs. ${Number(activeData?.expenses || 0).toLocaleString()}`} 
            subtitle={`Transport: Rs. ${Math.round(activeData?.transportExpenses || 0).toLocaleString()} • Purchases: Rs. ${Math.round(activeData?.purchases || 0).toLocaleString()} (Paid: Rs. ${Math.round(activeData?.vendorPayments || 0).toLocaleString()})`} 
            variant="rose"
            onClick={() => navigate('/expenses')}
          />
          <ModernKpiCard 
            icon={Wallet} 
            title={`${getPeriodLabel()} Operating Profit`} 
            value={`Rs. ${operatingProfit.toLocaleString()}`} 
            subtitle={`COGS: Rs. ${Number(activeData?.estimatedCogs || 0).toLocaleString()} (${activeData?.grossMarginPct || 0}% GM) • Net Cash: Rs. ${Number(activeData?.netCashFlow || 0).toLocaleString()}`} 
            variant={operatingProfit >= 0 ? "emerald" : "rose"}
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

        {/* Payment Channels & Size Breakdown */}
        <CashBreakdownSection 
          cashByMethod={activeData?.cashByMethod} 
          salesBySize={activeData?.salesBySize} 
          cashBySize={activeData?.cashBySize} 
        />
      </section>

      {/* 2. Interactive Recharts Analytics (2-Mode Profitability vs Cash Flow) */}
      <div className="card-surface p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <BarChart3 size={17} className="text-slate-600" />
            <h3 className="font-bold text-slate-800 text-xs sm:text-sm uppercase tracking-wider">
              {chartMode === 'profit' ? 'Profitability & COGS Trajectory' : 'Cash Flow & Treasury Trajectory'}
            </h3>
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 text-[11px] ml-1">
              <button
                type="button"
                onClick={() => setChartMode('profit')}
                className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                  chartMode === 'profit' ? 'bg-white text-brand shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Profitability &amp; COGS
              </button>
              <button
                type="button"
                onClick={() => setChartMode('cash')}
                className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                  chartMode === 'cash' ? 'bg-white text-brand shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cash Flow &amp; Treasury
              </button>
            </div>
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
              {chartMode === 'profit' ? (
                <>
                  <Bar dataKey="Net Sales (Ex-GST)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Estimated COGS" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Operating Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Line type="monotone" dataKey="Operating Profit" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
                </>
              ) : (
                <>
                  <Bar dataKey="Cash Inflow" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Expenses + Vendor Paid" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Material Purchases" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Line type="monotone" dataKey="Net Cash Flow" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3, fill: '#0284c7' }} activeDot={{ r: 5 }} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Customer Risk & Bottle Intelligence Hub — Consolidated & Non-Bloated */}
      <CustomerRiskHub />

      {/* 3. Operational Cockpit: 2-Column Split for high-density overview with minimal scrolling */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 pt-1">
        {/* Left Column (7 cols): Purchasing, Payables & Logistics */}
        <div className="lg:col-span-7 space-y-4">
          {/* Procurement Summary & Payables */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-slate-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Procurement &amp; Payables</h3>
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

          {/* Transport & Fleet Status (Driven by synced analytics expenses + vehicles count) */}
          {fleetLoaded && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Fuel size={16} className="text-brand" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Transport &amp; Fleet Status</h3>
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
                  value={`${vehicleCount} Vehicles`}
                  subtitle="Operational delivery units"
                  variant="brand"
                  onClick={() => navigate('/transport?tab=fleet')}
                />
                <ModernKpiCard
                  icon={Fuel}
                  title={`${getPeriodLabel()} Transport Spend`}
                  value={`Rs. ${Math.round(activeData.transportExpenses || 0).toLocaleString()}`}
                  subtitle={`General expenses (${getPeriodText()}): Rs. ${Math.round(activeData.generalExpenses || 0).toLocaleString()}`}
                  variant="brand"
                  onClick={() => navigate('/transport?tab=expenses')}
                />
              </div>

              <button
                type="button"
                onClick={() => navigate('/transport?tab=expenses')}
                className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-brand font-bold text-xs rounded-xl border border-slate-200/80 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Open Transport Expense Log</span>
                <span>&rarr;</span>
              </button>
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
