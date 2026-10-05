import { useState, useMemo } from 'react';
import { Wallet, CreditCard, ShoppingBag, BarChart3 } from 'lucide-react';
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
import ChartTooltip from './charts/ChartTooltip';
import CustomerRiskHub from './CustomerRiskHub';
import { formatCompactCurrency, formatCompactNumber } from '../../utils/chartFormatters';
import { useTenant } from '../../context/TenantContext';
import { TimeframeDropdown } from '../ui';

export default function MarketingDashboardView({ data }) {
  const { isWadaana } = useTenant();
  const companyTitle = isWadaana ? 'Wadaana Ind.' : 'AquaSphere';

  const [timeframe, setTimeframe] = useState('1_MONTH');
  const [selectedDays, setSelectedDays] = useState('30');
  const totalReceivables = Number(data?.totalOutstandingReceivables ?? data?.totalReceivables ?? 0);

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
      cash: Number(tf.cash ?? data.cash ?? 0),
      credit: Number(tf.credit ?? data.credit ?? 0),
      bottlesSold: Number(tf.bottlesSold ?? data.bottlesSold ?? 0)
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

  const chartData = useMemo(() => {
    const rawHistory = data?.dailySalesHistory || [];
    const daysNum = parseInt(selectedDays, 10);
    const sliced = rawHistory.slice(-daysNum);

    return sliced.map(d => ({
      day: daysNum > 14 ? d.date?.substring(5) : d.day,
      date: d.date,
      'Orders Count': Number(d.ordersCount || 0),
      'Cash Collected (Rs)': Number(d.cashCollected || 0),
      'Credit Billed (Rs)': Number(d.creditBilled || 0)
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
              <span className="text-xs text-slate-400 font-medium">Sales Operations</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-0.5">
              Marketing & Order Performance
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <span className="text-xs text-slate-400 font-medium">Timeframe:</span>
          <TimeframeDropdown value={timeframe} onChange={handleTimeframeChange} />
        </div>
      </div>

      {/* 1. Sales & Commercial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <ModernKpiCard
          icon={Wallet}
          title={`${getPeriodLabel()} Sales`}
          value={`Rs. ${Number(activeData?.sales || 0).toLocaleString()}`}
          subtitle={`${activeData?.bottlesSold || 0} orders recorded`}
          variant="brand"
        />
        <ModernKpiCard
          icon={CreditCard}
          title={`${getPeriodLabel()} Cash`}
          value={`Rs. ${Number(activeData?.cash || 0).toLocaleString()}`}
          subtitle="Received in cash"
          variant="emerald"
        />
        <ModernKpiCard
          icon={CreditCard}
          title={`${getPeriodLabel()} Credit`}
          value={`Rs. ${Number(activeData?.credit || 0).toLocaleString()}`}
          subtitle="Billed on credit"
          variant="amber"
        />
        <ModernKpiCard
          icon={CreditCard}
          title="Market Udhaar (Receivables)"
          value={`Rs. ${totalReceivables.toLocaleString()}`}
          subtitle="Customer unpaid balance"
          variant="amber"
        />
      </div>

      {/* 2. Recharts Composed Chart (Bar: Cash, Line: Orders) */}
      <div className="card-surface p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-slate-600" />
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Orders & Cash Collections</h3>
          </div>
          <select
            value={selectedDays}
            onChange={(e) => setSelectedDays(e.target.value)}
            className="select-base text-xs py-1 px-2.5 w-auto cursor-pointer"
          >
            <option value="7">Past 7 Days</option>
            <option value="14">Past 14 Days</option>
            <option value="30">Past 30 Days</option>
          </select>
        </div>

        <div className="w-full h-56 sm:h-64 pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis 
                yAxisId="left" 
                orientation="left" 
                tickFormatter={formatCompactCurrency} 
                stroke="#10b981" 
                tick={{ fontSize: 10, fill: '#10b981', fontWeight: 600 }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tickFormatter={formatCompactNumber} 
                stroke="#0284c7" 
                tick={{ fontSize: 10, fill: '#0284c7', fontWeight: 600 }} 
                axisLine={false} 
                tickLine={false} 
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px', fontWeight: 600 }} iconType="circle" />
              <Bar yAxisId="left" dataKey="Cash Collected (Rs)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Line yAxisId="right" type="monotone" dataKey="Orders Count" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3, fill: '#0284c7' }} activeDot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Customer Risk & Market Udhaar Hub */}
      <CustomerRiskHub />
    </div>
  );
}
