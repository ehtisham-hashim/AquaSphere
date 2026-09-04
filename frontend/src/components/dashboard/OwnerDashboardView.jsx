import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, TrendingUp, Receipt, ShoppingCart, CreditCard, Sparkles, PieChart as PieIcon, BarChart3, Fuel, Car, ArrowRight } from 'lucide-react';
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
import DashboardKpiCard from './DashboardKpiCard';
import PurchasingSummaryTab from './PurchasingSummaryTab';
import LowStockAlertGrid from './LowStockAlertGrid';
import { getCompanyFromCookie } from '../../utils/companyCookie';
import { API_URL } from '../../utils/api';
import { TimeframeDropdown } from '../ui';

const COST_COLORS = ['#f43f5e', '#9333ea'];
const REVENUE_COLORS = ['#10b981', '#2563eb'];

export default function OwnerDashboardView({ data, summary, summaryLoading }) {
  const tenant = getCompanyFromCookie();
  const companyTitle = tenant === 'wadaana' ? 'Wadaana Industries' : 'AquaSphere';

  const [timeframe, setTimeframe] = useState('MONTHLY'); // 'MONTHLY', 'DAILY', 'YEARLY'

  const activeData = useMemo(() => {
    if (!data) return {};
    const tfKey = timeframe.toLowerCase();
    if (data[tfKey]) return data[tfKey];
    return {
      sales: Number(data.sales || 0),
      cash: Number(data.cash || 0),
      expenses: Number(data.expenses || 0),
      netCash: Number(data.netCash || (Number(data.cash || 0) - Number(data.expenses || 0))),
      purchases: Number(data.purchases || data.monthlyPurchases || data.todaysPurchases || 0),
      purchasesCount: Number(data.purchasesCount || data.todaysPurchasesCount || 0),
      bottlesSold: Number(data.bottlesSold || 0)
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

  const [chartTimeframe, setChartTimeframe] = useState('7'); // '7', '14', '30', '12m'

  // Format Recharts Composed Chart Data based on selected chartTimeframe
  const trendData = useMemo(() => {
    if (!data) return [];
    if (chartTimeframe === '12m') {
      const trend = data.monthlyTrend || [];
      return trend.map(m => ({
        label: m.month,
        'Sales Revenue': Number(m.sales || 0),
        'Cash Inflow': Number(m.cash || 0),
        Expenses: Number(m.expenses || 0),
        Purchases: Number(m.purchases || 0),
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
        Purchases: Number(d.purchases || 0),
        'Net Profit': Number(d.netCash || 0)
      }));
    }
  }, [data, chartTimeframe]);

  // Operating Cost Breakdown Pie Data
  const costBreakdownData = useMemo(() => {
    const expensesVal = Number(activeData.expenses || 0);
    const purchasesVal = Number(activeData.purchases || 0);
    if (expensesVal === 0 && purchasesVal === 0) return [];
    return [
      { name: 'Operating Expenses', value: expensesVal },
      { name: 'Material Purchases', value: purchasesVal }
    ];
  }, [activeData]);

  // Revenue Stream Breakdown Pie Data
  const revenueStreamData = useMemo(() => {
    const orderCashVal = Number(activeData.orderCash || (activeData.cash * 0.7) || 0);
    const spotCashVal = Number(activeData.spotSalesCash || (activeData.cash * 0.3) || 0);
    if (orderCashVal === 0 && spotCashVal === 0) return [];
    return [
      { name: 'Order Collections', value: orderCashVal },
      { name: 'Spot Counter Sales', value: spotCashVal }
    ];
  }, [activeData]);

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
    <div className="space-y-8 p-2 max-w-[98%] mx-auto pb-10">
      {/* ── Top Executive Banner ───────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
              <Sparkles size={12} className="text-indigo-500" />
              {companyTitle} • EXECUTIVE CONTROL
            </span>
            <span className="text-xs text-slate-500 font-medium">Full Financial & Operations Oversight</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black mt-2 tracking-tight text-slate-900 flex items-center gap-2">
            Executive Owner Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Live database overview of sales revenue, cash inflow, operating expenses, procurement costs, and inventory health.
          </p>
        </div>

        {/* Primary High-Level Metric Badge */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center gap-4 min-w-[240px]">
          <div className={`p-3 rounded-xl ${netCash >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
            <Wallet size={28} />
          </div>
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">{getPeriodLabel()} Net Cash Position</span>
            <div className={`text-2xl font-black font-mono ${netCash >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              Rs. {netCash.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 block font-medium">Cash Collected - Operating Expenses</span>
          </div>
        </div>
      </div>

      {/* ── 1. Executive Financial Overview Grid ────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Executive Financial Overview</h2>
          </div>

          {/* Time Horizon Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Timeframe:</span>
            <TimeframeDropdown value={timeframe} onChange={setTimeframe} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <DashboardKpiCard 
            icon={<Wallet />} 
            title={timeframe === 'DAILY' ? "TODAY'S SALES" : timeframe === 'YEARLY' ? "YEARLY SALES" : "MONTHLY SALES"} 
            value={`Rs. ${Number(activeData?.sales || 0).toLocaleString()}`} 
            subtitle={`${activeData?.bottlesSold || 0} orders ${getPeriodText()}`} 
            color="text-sky-600" 
            bg="bg-sky-50" 
            border="border-sky-100" 
          />
          <DashboardKpiCard 
            icon={<CreditCard />} 
            title="CASH COLLECTED" 
            value={`Rs. ${Number(activeData?.cash || 0).toLocaleString()}`} 
            subtitle={`Cash received ${getPeriodText()}`} 
            color="text-emerald-600" 
            bg="bg-emerald-50" 
            border="border-emerald-100" 
          />
          <DashboardKpiCard 
            icon={<Receipt />} 
            title={timeframe === 'DAILY' ? "EXPENSES TODAY" : timeframe === 'YEARLY' ? "YEARLY EXPENSES" : "MONTHLY EXPENSES"} 
            value={`Rs. ${Number(activeData?.expenses || 0).toLocaleString()}`} 
            subtitle="Logged operating cost" 
            color="text-rose-600" 
            bg="bg-rose-50" 
            border="border-rose-100" 
          />
          <DashboardKpiCard 
            icon={<Wallet />} 
            title="NET CASH" 
            value={`Rs. ${netCash.toLocaleString()}`} 
            subtitle="Cash - Expenses" 
            color={netCash >= 0 ? "text-emerald-700" : "text-rose-700"} 
            bg={netCash >= 0 ? "bg-emerald-50" : "bg-rose-50"} 
            border={netCash >= 0 ? "border-emerald-100" : "border-rose-100"} 
          />
          <DashboardKpiCard 
            icon={<ShoppingCart />} 
            title={timeframe === 'DAILY' ? "TODAY'S PURCHASES" : timeframe === 'YEARLY' ? "YEARLY PURCHASES" : "MONTHLY PURCHASES"} 
            value={`Rs. ${Number(activeData?.purchases || 0).toLocaleString()}`} 
            subtitle={`${activeData?.purchasesCount || 0} purchase logs`} 
            color="text-purple-600" 
            bg="bg-purple-50" 
            border="border-purple-100" 
          />
        </div>
      </section>

      {/* ── 2. Executive Interactive Recharts Analytics ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Main Financial & Profitability Trend Chart (8 Cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-slate-700" />
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                Financial Growth & Profitability Trajectory
              </h3>
            </div>
            <select
              value={chartTimeframe}
              onChange={(e) => setChartTimeframe(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 transition shadow-2xs cursor-pointer"
            >
              <option value="7">Past 7 Days</option>
              <option value="14">Past 14 Days</option>
              <option value="30">Past 30 Days</option>
              <option value="12m">Past 12 Months</option>
            </select>
          </div>

          <div className="w-full h-72 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    border: 'none', 
                    borderRadius: '12px', 
                    color: '#fff', 
                    fontSize: '11px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                    padding: '10px 14px'
                  }}
                  itemStyle={{ color: '#e2e8f0', fontSize: '11px', padding: '2px 0' }}
                  labelStyle={{ fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}
                  cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                  formatter={(val) => `Rs. ${Number(val).toLocaleString()}`}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontWeight: 600 }} iconType="circle" />
                <Bar dataKey="Sales Revenue" fill="#0284c7" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={600} />
                <Bar dataKey="Cash Inflow" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={600} />
                <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={600} />
                <Line type="monotone" dataKey="Net Profit" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0ea5e9' }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={800} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost & Revenue Breakdown Donuts (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Operating Cost Breakdown Donut */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <PieIcon size={16} className="text-slate-700" />
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Operating Costs Breakdown</h3>
            </div>
            {costBreakdownData.length === 0 ? (
              <div className="h-36 flex items-center justify-center text-xs text-slate-400 font-medium">
                No cost entries for this period.
              </div>
            ) : (
              <div className="w-full h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={costBreakdownData} innerRadius={35} outerRadius={55} paddingAngle={4} dataKey="value">
                      {costBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COST_COLORS[index % COST_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '11px' }}
                      formatter={(val) => `Rs. ${Number(val).toLocaleString()}`}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Revenue Stream Breakdown Donut */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <PieIcon size={16} className="text-slate-700" />
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Cash Revenue Stream Distribution</h3>
            </div>
            {revenueStreamData.length === 0 ? (
              <div className="h-36 flex items-center justify-center text-xs text-slate-400 font-medium">
                No revenue entries for this period.
              </div>
            ) : (
              <div className="w-full h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={revenueStreamData} innerRadius={35} outerRadius={55} paddingAngle={4} dataKey="value">
                      {revenueStreamData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={REVENUE_COLORS[index % REVENUE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '11px' }}
                      formatter={(val) => `Rs. ${Number(val).toLocaleString()}`}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── 3. Purchasing & Vendor Payables Cards ───────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart size={20} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Purchasing & Vendor Payables</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-purple-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Monthly Purchases Total</h4>
              <p className="text-3xl font-black text-slate-800 font-mono">
                Rs. {Number(data?.monthlyPurchases || data?.monthly?.purchases || 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">Raw material spend this month.</p>
            </div>
            <div className="bg-purple-50 text-purple-600 p-4 rounded-full"><ShoppingCart size={32} /></div>
          </div>

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
        </div>
      </section>

      {/* ── 4. Low Stock Raw Material Warning ───────────────────────────────── */}
      <LowStockAlertGrid count={data?.lowStockMaterialsCount} list={data?.lowStockMaterialsList} />

      {/* ── 5. Purchasing & Vendor Summary ──────────────────────────────────── */}
      <PurchasingSummaryTab summary={summary} loading={summaryLoading} />

      {/* ── 6. Transport & Logistics Summary ─────────────────────────────────── */}
      {transportLoaded && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fuel size={20} className={tenant === 'wadaana' ? 'text-[#0ea5e9]' : 'text-emerald-600'} />
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Transport & Logistics Overview</h2>
            </div>
            <Link
              to="/transport-expenses"
              className={`text-xs font-bold flex items-center gap-1 hover:underline ${
                tenant === 'wadaana' ? 'text-[#0ea5e9]' : 'text-emerald-600'
              }`}
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Active Fleet Size</h4>
                <p className="text-3xl font-black text-slate-800 font-mono">{transportData.vehicleCount} Vehicles</p>
                <p className="text-xs text-slate-500 mt-1">Total operational delivery units.</p>
              </div>
              <div className={`p-4 rounded-full ${tenant === 'wadaana' ? 'bg-sky-50 text-[#0ea5e9]' : 'bg-emerald-50 text-emerald-600'}`}>
                <Car size={32} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Recent Transport Spend</h4>
                <p className={`text-3xl font-black font-mono ${tenant === 'wadaana' ? 'text-[#0ea5e9]' : 'text-emerald-700'}`}>
                  Rs. {Math.round(transportData.monthlySpend).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">Vehicle fuel & repair costs this month.</p>
              </div>
              <div className={`p-4 rounded-full ${tenant === 'wadaana' ? 'bg-sky-50 text-[#0ea5e9]' : 'bg-emerald-50 text-emerald-600'}`}>
                <Fuel size={32} />
              </div>
            </div>
          </div>

          {/* Compact Recent Transport Expenses Table */}
          {transportData.expenses.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                Recent Transport Expenses
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-500 font-bold uppercase">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Vehicle</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transportData.expenses.slice(0, 5).map((ex) => (
                      <tr key={ex.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-slate-600">{new Date(ex.date || ex.createdAt).toLocaleDateString()}</td>
                        <td className="p-3 font-semibold text-slate-800">
                          {ex.vehicle?.name || '—'} <span className="text-slate-400 font-mono font-normal">({ex.vehicle?.plateNumber})</span>
                        </td>
                        <td className="p-3 font-bold text-slate-700">{ex.type}</td>
                        <td className={`p-3 font-black ${tenant === 'wadaana' ? 'text-[#0ea5e9]' : 'text-emerald-700'}`}>
                          Rs. {Math.round(Number(ex.amount)).toLocaleString()}
                        </td>
                        <td className="p-3 text-slate-600 max-w-[200px] truncate">{ex.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
