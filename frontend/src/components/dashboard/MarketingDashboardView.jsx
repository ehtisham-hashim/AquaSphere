import { useState, useMemo } from 'react';
import { Wallet, CreditCard, ShieldAlert, TrendingUp, ShoppingBag, BarChart3 } from 'lucide-react';
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
import AlertsSection from './AlertsSection';
import { getCompanyFromCookie } from '../../utils/companyCookie';

export default function MarketingDashboardView({ data }) {
  const tenant = getCompanyFromCookie();
  const companyTitle = tenant === 'wadaana' ? 'Wadaana Ind.' : 'AquaSphere';

  const [selectedDays, setSelectedDays] = useState('7');

  // Instant zero-network chart data computation
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
    <div className="space-y-3.5 max-w-7xl mx-auto pb-6 text-slate-800">
      {/* Top Compact Banner */}
      <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-slate-100 rounded-lg text-slate-700">
            <ShoppingBag size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                {companyTitle} • MARKETING
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Sales & Orders</span>
            </div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">
              Marketing Performance
            </h1>
          </div>
        </div>
      </div>

      {/* 1. Compact Sales KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Today&apos;s Sales</span>
            <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
              Rs. {Number(data?.sales || 0).toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">{data?.bottlesSold || 0} orders recorded</span>
          </div>
          <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
            <Wallet size={16} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Cash Collected</span>
            <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">
              Rs. {Number(data?.cash || 0).toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Cash received today</span>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
            <CreditCard size={16} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Credit Billed</span>
            <div className="text-lg font-black text-purple-800 font-mono mt-0.5">
              Rs. {Number(data?.credit || 0).toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Billed on credit today</span>
          </div>
          <div className="p-2 bg-purple-50 text-purple-700 rounded-lg">
            <CreditCard size={16} />
          </div>
        </div>
      </div>

      {/* 2. Compact Recharts Bar Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1.5">
            <BarChart3 size={15} className="text-slate-600" />
            <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Orders & Cash Collected Chart</h3>
          </div>
          <select
            value={selectedDays}
            onChange={(e) => setSelectedDays(e.target.value)}
            className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] font-bold text-slate-700 outline-none focus:border-emerald-500 transition shadow-2xs cursor-pointer"
          >
            <option value="7">Past 7 Days</option>
            <option value="14">Past 14 Days</option>
            <option value="30">Past 30 Days</option>
          </select>
        </div>

        <div className="w-full h-44 pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" orientation="left" stroke="#10b981" tick={{ fontSize: 10, fill: '#10b981', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="#2563eb" tick={{ fontSize: 10, fill: '#2563eb', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  border: 'none', 
                  borderRadius: '10px', 
                  color: '#fff', 
                  fontSize: '10px',
                  boxShadow: '0 8px 20px -4px rgba(0,0,0,0.3)',
                  padding: '8px 12px'
                }}
                itemStyle={{ color: '#e2e8f0', fontSize: '10px', padding: '1px 0' }}
                labelStyle={{ fontWeight: 'bold', color: '#f8fafc', marginBottom: '2px' }}
                cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '4px', fontSize: '10px', fontWeight: 600 }} iconType="circle" />
              <Bar yAxisId="right" dataKey="Orders Count" fill="#2563eb" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={500} />
              <Bar yAxisId="left" dataKey="Cash Collected (Rs)" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={500} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Customer Credit & Inactivity Alerts */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-1.5">
          <ShieldAlert size={16} className="text-slate-500" />
          <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Customer Credit & Inactivity Alerts</h2>
        </div>
        <AlertsSection />
      </section>
    </div>
  );
}
