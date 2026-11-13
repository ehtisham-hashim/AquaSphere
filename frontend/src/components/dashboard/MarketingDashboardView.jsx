import { useState, useMemo } from 'react';
import { ShoppingBag, Truck, CheckCircle2, Package, BarChart3 } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import ModernKpiCard from './ModernKpiCard';
import ChartTooltip from './charts/ChartTooltip';
import CustomerRiskHub from './CustomerRiskHub';
import { formatCompactNumber } from '../../utils/chartFormatters';
import { useTenant } from '../../context/TenantContext';
import { TimeframeDropdown } from '../ui';

export default function MarketingDashboardView({ data }) {
  const { isWadaana } = useTenant();
  const companyTitle = isWadaana ? 'Wadaana Ind.' : 'AquaSphere';

  const [timeframe, setTimeframe] = useState('1_MONTH');
  const [selectedDays, setSelectedDays] = useState('30');
  const [chartView, setChartView] = useState('pipeline'); // 'pipeline' | 'skus'

  const handleTimeframeChange = (tf) => {
    setTimeframe(tf);
    if (tf === 'TODAY' || tf === 'DAILY' || tf === 'YESTERDAY') setSelectedDays('1');
    else if (tf === 'LAST_3_DAYS') setSelectedDays('3');
    else if (tf === '1_WEEK') setSelectedDays('7');
    else if (tf === '1_MONTH') setSelectedDays('30');
    else if (tf === '1_YEAR') setSelectedDays('365');
  };

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
        ordersCount: Number(tf.ordersCount ?? tf.bottlesSold ?? 0),
        deliveredOrdersCount: Number(tf.deliveredOrdersCount ?? 0),
        pendingOrdersCount: Number(tf.pendingOrdersCount ?? 0),
        partialOrdersCount: Number(tf.partialOrdersCount ?? 0),
        skuVolumes: tf.skuVolumes || {}
      };
    }

    const tf = tfKey === 'monthly' ? (data.monthly || data) : (data.daily || data);
    return {
      ordersCount: Number(tf?.ordersCount ?? tf?.bottlesSold ?? data.bottlesSold ?? 0),
      deliveredOrdersCount: Number(tf?.deliveredOrdersCount ?? 0),
      pendingOrdersCount: Number(tf?.pendingOrdersCount ?? 0),
      partialOrdersCount: Number(tf?.partialOrdersCount ?? 0),
      skuVolumes: tf?.skuVolumes || {}
    };
  }, [data, timeframe]);

  const getPeriodLabel = () => {
    if (timeframe === 'DAILY' || timeframe === 'TODAY') return "Today's";
    if (timeframe === 'YESTERDAY') return "Yesterday's";
    if (timeframe === 'LAST_3_DAYS') return "Last 3 Days";
    if (timeframe === '1_WEEK') return "This Week's";
    if (timeframe === '1_YEAR') return "This Year's";
    return "This Month's";
  };

  const totalOrders = Number(activeData.ordersCount || 0);
  const deliveredCount = Number(activeData.deliveredOrdersCount || 0);
  const partialCount = Number(activeData.partialOrdersCount || 0);
  const pendingCount = Number(activeData.pendingOrdersCount || 0) + partialCount;
  const liveQueueCount = Number(data?.pendingDispatchCount ?? pendingCount);
  const fulfillmentRate = totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 0;

  const skuChartData = useMemo(() => {
    const entries = Object.entries(activeData.skuVolumes || {});
    return entries
      .map(([product, units]) => ({
        product,
        'Units Sold': Number(units || 0)
      }))
      .filter(d => d['Units Sold'] > 0)
      .sort((a, b) => b['Units Sold'] - a['Units Sold']);
  }, [activeData.skuVolumes]);

  const totalSkuUnits = useMemo(() => {
    return skuChartData.reduce((sum, item) => sum + item['Units Sold'], 0);
  }, [skuChartData]);

  const pipelineChartData = useMemo(() => {
    if (selectedDays === '365') {
      const monthly = data?.monthlyTrend || [];
      return monthly.map(m => ({
        day: m.month,
        'Orders Placed': Number(m.ordersCount || 0),
        'Delivered Orders': Number(m.deliveredOrdersCount || 0)
      }));
    }
    const rawHistory = data?.dailySalesHistory || [];
    const daysNum = parseInt(selectedDays, 10) || 30;
    const sliced = rawHistory.slice(-daysNum);

    return sliced.map(d => ({
      day: daysNum > 14 ? d.date?.substring(5) : d.day,
      date: d.date,
      'Orders Placed': Number(d.ordersCount || 0),
      'Delivered Orders': Number(d.deliveredOrdersCount || 0)
    }));
  }, [data, selectedDays]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-6 text-slate-800">
      {/* Top Action Header */}
      <div className="card-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-light text-brand rounded-xl">
            <ShoppingBag size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="badge-brand">
                {companyTitle} • MARKETING
              </span>
              <span className="text-xs text-slate-400 font-medium">Sales &amp; Order Operations</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-0.5">
              Marketing &amp; Order Performance
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <span className="text-xs text-slate-400 font-medium">Timeframe:</span>
          <TimeframeDropdown value={timeframe} onChange={handleTimeframeChange} />
        </div>
      </div>

      {/* 1. Operational Order & Delivery KPIs (Strictly non-financial counts & volumes) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <ModernKpiCard
          icon={ShoppingBag}
          title={`${getPeriodLabel()} Orders`}
          value={`${totalOrders.toLocaleString()} Orders`}
          subtitle={`${deliveredCount} delivered • ${pendingCount} open`}
          variant="brand"
        />
        <ModernKpiCard
          icon={CheckCircle2}
          title={`${getPeriodLabel()} Delivered`}
          value={`${deliveredCount.toLocaleString()} Delivered`}
          subtitle={`${fulfillmentRate}% fulfillment rate`}
          variant="emerald"
        />
        <ModernKpiCard
          icon={Truck}
          title="Pending Dispatches"
          value={`${liveQueueCount.toLocaleString()} Pending`}
          subtitle={partialCount > 0 ? `${partialCount} partial in period` : 'Awaiting delivery to customer'}
          variant="amber"
        />
        <ModernKpiCard
          icon={Package}
          title={isWadaana ? `${getPeriodLabel()} Units Sold` : "Bottles In Circulation"}
          value={isWadaana ? `${totalSkuUnits.toLocaleString()} Units` : `${Number(data?.bottleCustody?.totalInCirculation || 0).toLocaleString()} Bottles`}
          subtitle={isWadaana ? `${skuChartData.length} active products sold` : '19L bottles with clients'}
          variant="sky"
        />
      </div>

      {/* 2. 2-Mode Non-Financial Chart (Order Fulfillment Pipeline vs Units Sold by Product) */}
      <div className="card-surface p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <BarChart3 size={16} className="text-slate-600" />
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              {chartView === 'pipeline' ? 'Order Fulfillment Pipeline' : `Units Sold by Product (${getPeriodLabel()})`}
            </h3>
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 text-[11px] ml-1">
              <button
                type="button"
                onClick={() => setChartView('pipeline')}
                className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                  chartView === 'pipeline' ? 'bg-white text-brand shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Order Pipeline
              </button>
              <button
                type="button"
                onClick={() => setChartView('skus')}
                className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                  chartView === 'skus' ? 'bg-white text-brand shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Units by Product
              </button>
            </div>
          </div>
          {chartView === 'pipeline' && (
            <select
              value={selectedDays}
              onChange={(e) => setSelectedDays(e.target.value)}
              className="select-base text-xs py-1 px-2.5 w-auto cursor-pointer"
            >
              <option value="7">Past 7 Days</option>
              <option value="14">Past 14 Days</option>
              <option value="30">Past 30 Days</option>
              <option value="365">Past 12 Months</option>
            </select>
          )}
        </div>

        <div className="w-full h-56 sm:h-64 pt-1">
          {chartView === 'skus' && skuChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
              No product dispatch volumes recorded for this timeframe.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'pipeline' ? (
                <BarChart data={pipelineChartData} margin={{ top: 10, right: 16, left: 16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis 
                    allowDecimals={false}
                    tickFormatter={formatCompactNumber} 
                    stroke="#0284c7" 
                    tick={{ fontSize: 10, fill: '#0284c7', fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px', fontWeight: 600 }} iconType="circle" />
                  <Bar dataKey="Orders Placed" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="Delivered Orders" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              ) : (
                <BarChart data={skuChartData} margin={{ top: 10, right: 16, left: 16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="product" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis 
                    allowDecimals={false}
                    tickFormatter={formatCompactNumber} 
                    stroke="#0284c7" 
                    tick={{ fontSize: 10, fill: '#0284c7', fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px', fontWeight: 600 }} iconType="circle" />
                  <Bar dataKey="Units Sold" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 3. Customer Risk & Market Udhaar Hub */}
      <CustomerRiskHub />
    </div>
  );
}
