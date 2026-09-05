import { useState, useMemo } from 'react';
import { Wallet, CreditCard, ShieldAlert, ShoppingBag, BarChart3 } from 'lucide-react';
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
import AlertsSection from './AlertsSection';
import ModernKpiCard from './ModernKpiCard';
import ChartTooltip from './charts/ChartTooltip';
import { formatCompactCurrency, formatCompactNumber } from '../../utils/chartFormatters';
import { useTenant } from '../../context/TenantContext';

export default function MarketingDashboardView({ data }) {
  const { isWadaana } = useTenant();
  const companyTitle = isWadaana ? 'Wadaana Ind.' : 'AquaSphere';

  const [selectedDays, setSelectedDays] = useState('7');

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
      <div className="card-surface p-4 flex items-center justify-between">
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
      </div>

      {/* 1. Sales KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <ModernKpiCard
          icon={Wallet}
          title="Today's Sales"
          value={`Rs. ${Number(data?.sales || 0).toLocaleString()}`}
          subtitle={`${data?.bottlesSold || 0} orders recorded`}
          variant="brand"
        />
        <ModernKpiCard
          icon={CreditCard}
          title="Cash Collected"
          value={`Rs. ${Number(data?.cash || 0).toLocaleString()}`}
          subtitle="Received in cash today"
          variant="emerald"
        />
        <ModernKpiCard
          icon={CreditCard}
          title="Credit Billed"
          value={`Rs. ${Number(data?.credit || 0).toLocaleString()}`}
          subtitle="Billed on credit today"
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

      {/* 3. Customer Credit & Inactivity Alerts */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-slate-500" />
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Customer Risk & Credit Alerts</h2>
        </div>
        <AlertsSection />
      </section>
    </div>
  );
}
