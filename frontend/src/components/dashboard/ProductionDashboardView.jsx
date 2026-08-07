import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  Plus, 
  ArrowRightLeft, 
  ShoppingCart, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Factory, 
  Building, 
  ShieldCheck,
  RefreshCw,
  ChevronRight,
  BarChart3
} from 'lucide-react';
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
import { API_URL as API } from '../../utils/api';
import { getCompanyFromCookie } from '../../utils/companyCookie';

const formatNum = (val) => {
  const num = Number(val || 0);
  if (Number.isInteger(num)) return num.toLocaleString();
  return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

export default function ProductionDashboardView() {
  const tenant = getCompanyFromCookie();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDays, setSelectedDays] = useState('7');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/analytics/production-dashboard?tenant=${tenant}&days=${selectedDays}`, {
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.message || 'Failed to load production analytics');
      }
    } catch (err) {
      console.error(err);
      setError('Network error loading production dashboard');
    } finally {
      setLoading(false);
    }
  }, [tenant, selectedDays]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const {
    todaysProduction = {},
    dailyProductionHistory = [],
    finishedGoods = [],
    rawMaterialHealth = [],
    lowStockCount = 0,
    pendingBatchesCount = 0,
    recentBatches = [],
    recentPurchases = [],
    dailyClose = {}
  } = data || {};

  const isWadaana = tenant === 'wadaana';

  // Top 5 raw materials closest to reorder level (ascending by stock ratio)
  const sortedRawMaterials = useMemo(() => {
    return [...rawMaterialHealth]
      .sort((a, b) => {
        const ratioA = a.reorderLevel > 0 ? (a.cachedQty / a.reorderLevel) : 999;
        const ratioB = b.reorderLevel > 0 ? (b.cachedQty / b.reorderLevel) : 999;
        return ratioA - ratioB;
      })
      .slice(0, 5);
  }, [rawMaterialHealth]);

  // Recharts data formatting
  const chartData = useMemo(() => {
    return dailyProductionHistory.map(d => {
      if (isWadaana) {
        return {
          day: d.day,
          date: d.date,
          'Pure 0.5L': Number(d.qtyPure05L || 0),
          'Pure 1.5L': Number(d.qtyPure15L || 0),
          'Mix 0.5L': Number(d.qtyMix05L || 0),
          'Mix 1.5L': Number(d.qtyMix15L || 0),
          'Broken / Waste': Number(d.totalWaste || 0)
        };
      }
      return {
        day: d.day,
        date: d.date,
        '19L Bottles': Number(d.total19L || 0),
        '1.5L Packs': Number(d.packs15L || 0),
        '0.5L Packs': Number(d.packs05L || 0),
        'Broken / Waste': Number(d.totalWaste || 0)
      };
    });
  }, [dailyProductionHistory, isWadaana]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="w-7 h-7 text-slate-400 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading Production Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-800">
        <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
        <p className="font-bold text-sm">{error}</p>
        <button onClick={fetchDashboardData} className="mt-3 px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs">
          Retry Loading
        </button>
      </div>
    );
  }

  const companyTitle = isWadaana ? 'Wadaana Ind.' : 'AquaSphere';

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-8 text-slate-800">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl shadow-2xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
              {companyTitle} • OPERATIONS
            </span>
            <span className="text-xs text-slate-400 font-medium">Production Control</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Factory className="w-6 h-6 text-slate-700" /> Production & Inventory Dashboard
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Real-time monitoring of factory runs, finished goods stock, and raw material health.
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/production"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5"
          >
            <Plus size={15} /> Log Batch
          </Link>
          <Link
            to="/inventory"
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
          >
            <ArrowRightLeft size={15} className="text-slate-500" /> Transfer Stock
          </Link>
          <Link
            to="/purchases"
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
          >
            <ShoppingCart size={15} className="text-slate-500" /> Record Purchase
          </Link>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Output */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Today&apos;s Output</span>
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
              <Factory size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {isWadaana ? (
              Number(todaysProduction.totalProduced || 0).toLocaleString()
            ) : (
              Number(todaysProduction.total19L || (todaysProduction.packs15L + todaysProduction.packs05L) || 0).toLocaleString()
            )}
            <span className="text-xs font-semibold text-slate-500 ml-1">
              {isWadaana ? 'Bottles' : '19L / Packs'}
            </span>
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1.5 flex items-center gap-1">
            <Clock size={12} className="text-slate-400" />
            <span>{todaysProduction.batchesCount || 0} batches completed today</span>
          </div>
        </div>

        {/* Factory Stock */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Factory Floor Stock</span>
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
              <Building size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {finishedGoods.reduce((sum, item) => sum + Number(item.factoryQty || 0), 0).toLocaleString()}
            <span className="text-xs font-semibold text-slate-500 ml-1">
              {isWadaana ? 'Bottles' : 'Units'}
            </span>
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1.5">
            Available at factory floor
          </div>
        </div>

        {/* Raw Material Health */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Raw Material Health</span>
            <div className={`p-1.5 rounded-lg ${lowStockCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {lowStockCount > 0 ? lowStockCount : 'Healthy'}
            <span className="text-xs font-semibold text-slate-500 ml-1">
              {lowStockCount > 0 ? 'Low Stock' : 'Stock'}
            </span>
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1.5">
            {lowStockCount > 0 ? `${lowStockCount} raw material(s) need refill` : 'All materials above reorder level'}
          </div>
        </div>

        {/* Daily Close Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Daily Close</span>
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
              <Lock size={16} />
            </div>
          </div>
          <div className="text-sm font-bold text-slate-900 mt-1">
            {dailyClose.isClosed ? (
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1">
                <CheckCircle2 size={13} /> Finalized & Locked
              </span>
            ) : dailyClose.pmConfirmed ? (
              <span className="text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1">
                <ShieldCheck size={13} /> PM Verified ✓
              </span>
            ) : (
              <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1">
                <Clock size={13} /> Pending PM Verification
              </span>
            )}
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-2">
            {pendingBatchesCount > 0 ? `${pendingBatchesCount} batch(es) pending` : 'No pending batches'}
          </div>
        </div>
      </div>

      {/* Main Grid Workspace (67% / 33% Split on large screens) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN: Production Graph & Runs Table (8 Cols = 67% width) */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Animated Recharts Stacked Bar Chart Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-slate-700" />
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Daily Production & Waste Chart</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedDays}
                  onChange={(e) => setSelectedDays(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 transition shadow-2xs cursor-pointer"
                >
                  <option value="7">Past 7 Days</option>
                  <option value="14">Past 14 Days</option>
                  <option value="30">Past 30 Days</option>
                </select>
              </div>
            </div>

            {/* Recharts Container */}
            <div className="w-full h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
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
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontWeight: 600 }} 
                    iconType="circle"
                  />
                  {isWadaana ? (
                    <>
                      <Bar dataKey="Pure 0.5L" stackId="a" fill="#0284c7" isAnimationActive={true} animationDuration={800} />
                      <Bar dataKey="Pure 1.5L" stackId="a" fill="#0ea5e9" isAnimationActive={true} animationDuration={800} />
                      <Bar dataKey="Mix 0.5L" stackId="a" fill="#8b5cf6" isAnimationActive={true} animationDuration={800} />
                      <Bar dataKey="Mix 1.5L" stackId="a" fill="#a855f7" isAnimationActive={true} animationDuration={800} />
                      <Bar dataKey="Broken / Waste" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={800} />
                    </>
                  ) : (
                    <>
                      <Bar dataKey="19L Bottles" stackId="a" fill="#2563eb" isAnimationActive={true} animationDuration={800} />
                      <Bar dataKey="1.5L Packs" stackId="a" fill="#9333ea" isAnimationActive={true} animationDuration={800} />
                      <Bar dataKey="0.5L Packs" stackId="a" fill="#10b981" isAnimationActive={true} animationDuration={800} />
                      <Bar dataKey="Broken / Waste" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={800} />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Production Runs Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Factory size={16} className="text-slate-600" />
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Recent Production Runs Table</h3>
              </div>
              <Link to="/production" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5">
                View All <ChevronRight size={14} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">Batch ID</th>
                    <th className="p-3">Output Produced</th>
                    <th className="p-3">Waste/Breakage</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Logged By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {recentBatches.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-400 font-medium">
                        No production runs logged today.
                      </td>
                    </tr>
                  ) : (
                    recentBatches.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-bold text-slate-800">{b.shortId}</td>
                        <td className="p-3 font-bold text-slate-900">
                          {isWadaana ? (
                            (() => {
                              const parts = [];
                              if (b.qtyPure05L > 0) parts.push(`Pure 0.5L (${b.qtyPure05L})`);
                              if (b.qtyPure15L > 0) parts.push(`Pure 1.5L (${b.qtyPure15L})`);
                              if (b.qtyMix05L > 0) parts.push(`Mix 0.5L (${b.qtyMix05L})`);
                              if (b.qtyMix15L > 0) parts.push(`Mix 1.5L (${b.qtyMix15L})`);

                              if (parts.length === 0) return <span className="text-slate-400 font-normal">0 bottles</span>;
                              if (parts.length === 1) return parts[0];

                              return (
                                <div className="flex items-center gap-1.5">
                                  <span>{parts[0]}</span>
                                  <span 
                                    title={parts.slice(1).join(', ')} 
                                    className="px-1.5 py-0.2 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 cursor-help"
                                  >
                                    +{parts.length - 1}
                                  </span>
                                </div>
                              );
                            })()
                          ) : (
                            (() => {
                              const parts = [];
                              if (b.quantity > 0) parts.push(`${b.quantity} (19L)`);
                              if (b.packs15L > 0) parts.push(`${b.packs15L} pk (1.5L)`);
                              if (b.packs05L > 0) parts.push(`${b.packs05L} pk (0.5L)`);

                              if (parts.length === 0) return <span className="text-slate-400 font-normal">0 units</span>;
                              if (parts.length === 1) return parts[0];

                              return (
                                <div className="flex items-center gap-1.5">
                                  <span>{parts[0]}</span>
                                  <span 
                                    title={parts.slice(1).join(', ')} 
                                    className="px-1.5 py-0.2 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 cursor-help"
                                  >
                                    +{parts.length - 1}
                                  </span>
                                </div>
                              );
                            })()
                          )}
                        </td>
                        <td className="p-3 font-semibold text-rose-600">
                          {b.wasteQuantity > 0 ? `${b.wasteQuantity} units` : <span className="text-slate-400 font-normal">0</span>}
                        </td>
                        <td className="p-3">
                          {b.status === 'COMPLETED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Completed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-500 font-medium">{b.createdBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Finished Goods Stock Breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-slate-600" />
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Finished Goods Stock Location Breakdown</h3>
              </div>
              <Link to="/inventory" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5">
                Manage Stock <ChevronRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {finishedGoods.map(fg => {
                const isLow = Number(fg.factoryQty || 0) <= 20;
                return (
                  <div key={fg.id} className={`border rounded-xl p-3.5 space-y-2 transition shadow-2xs ${
                    isLow ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-slate-900 text-xs">{fg.name}</div>
                      {isLow && (
                        <span className="px-1.5 py-0.2 bg-amber-600 text-white font-bold text-[9px] rounded uppercase">
                          LOW
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Factory Floor:</span>
                        <span className="font-bold text-slate-900 font-mono">{formatNum(fg.factoryQty)} {fg.unit}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Warehouse:</span>
                        <span className="font-semibold text-slate-700 font-mono">{formatNum(fg.warehouseQty)} {fg.unit}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between text-xs font-black text-slate-900">
                      <span>Total Stock:</span>
                      <span className="text-slate-900 font-mono">{formatNum(fg.cachedQty)} {fg.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Raw Materials (Top 5 Closest) & Purchases (4 Cols = 33% width) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Raw Material Stock Health (Top 5 Closest to Reorder Level) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-slate-600" />
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Top 5 Reorder Alert Materials</h3>
              </div>
              <Link to="/raw-materials" className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5">
                View All <ChevronRight size={14} />
              </Link>
            </div>

            <div className="space-y-2">
              {sortedRawMaterials.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-6 font-medium">No raw materials configured.</div>
              ) : (
                sortedRawMaterials.map(mat => (
                  <div key={mat.id} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800">{mat.name}</div>
                      <div className="text-[10px] text-slate-400">Reorder Level: {formatNum(mat.reorderLevel)} {mat.unit}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-xs">
                        {formatNum(mat.cachedQty)} <span className="text-[10px] font-normal text-slate-500">{mat.unit}</span>
                      </span>

                      {mat.status === 'OUT_OF_STOCK' && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 font-bold text-[10px] rounded">
                          OUT
                        </span>
                      )}
                      {mat.status === 'LOW_STOCK' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[10px] rounded">
                          LOW
                        </span>
                      )}
                      {mat.status === 'IN_STOCK' && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] rounded">
                          OK
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Raw Material Purchases */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-slate-600" />
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Recent Purchases</h3>
              </div>
              <Link to="/purchases" className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5">
                View All <ChevronRight size={14} />
              </Link>
            </div>

            <div className="space-y-2 text-xs">
              {recentPurchases.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-6 font-medium">No purchases logged recently.</div>
              ) : (
                recentPurchases.map(p => (
                  <div key={p.id} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <div className="flex justify-between items-center font-bold text-slate-800">
                      <span>{p.vendorName}</span>
                      <span className="font-mono text-slate-500 text-[11px]">{p.invoiceNo}</span>
                    </div>
                    <div className="text-slate-500 font-medium flex justify-between text-[11px]">
                      <span className="truncate max-w-[200px]">{p.items.map(i => `${i.name} (${i.qty} ${i.unit})`).join(', ')}</span>
                      <span className="font-black text-slate-900 shrink-0">Rs {p.grandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
