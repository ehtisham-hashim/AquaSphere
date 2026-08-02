import { useState, useEffect } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { API_URL as API } from '../../utils/api';
import { getCompanyFromCookie } from '../../utils/companyCookie';

export default function ProductionDashboardView() {
  const tenant = getCompanyFromCookie();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/analytics/production-dashboard`, {
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
  };

  useEffect(() => {
    fetchDashboardData();
  }, [tenant]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading Production Control Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center text-rose-800">
        <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
        <p className="font-bold text-sm">{error}</p>
        <button onClick={fetchDashboardData} className="mt-3 px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-xs">
          Retry Loading
        </button>
      </div>
    );
  }

  const {
    todaysProduction = {},
    finishedGoods = [],
    rawMaterialHealth = [],
    lowStockCount = 0,
    pendingBatchesCount = 0,
    recentBatches = [],
    recentPurchases = [],
    dailyClose = {}
  } = data || {};

  const companyTitle = tenant === 'wadaana' ? 'Wadaana Ind.' : 'AquaSphere';

  return (
    <div className="space-y-6 max-w-[98%] mx-auto pb-8">
      {/* ── Control Center Header ────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300">
              {companyTitle} • OPERATIONS
            </span>
            <span className="text-xs text-slate-500 font-semibold">Production Manager Portal</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight mt-1 flex items-center gap-2">
            <Factory className="w-7 h-7 text-purple-600" /> Production & Inventory Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            Real-time monitoring of factory runs, finished goods stock, and raw material health.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/production"
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-[0.98]"
          >
            <Plus size={16} /> Log Production Batch
          </Link>
          <Link
            to="/finished-goods"
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-[0.98]"
          >
            <ArrowRightLeft size={16} /> Transfer Stock
          </Link>
          <Link
            to="/purchases"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-[0.98]"
          >
            <ShoppingCart size={16} /> Record Purchase
          </Link>
          <Link
            to="/daily-close"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-[0.98]"
          >
            <Lock size={16} /> Daily Close
          </Link>
        </div>
      </div>

      {/* ── KPI Summary Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Output */}
        <div className="bg-white border border-purple-200 rounded-2xl p-5 shadow-sm bg-purple-50/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-purple-700">Today&apos;s Production</span>
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Factory size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-purple-950">
            {todaysProduction.total19L || (todaysProduction.packs15L + todaysProduction.packs05L) || 0}
            <span className="text-xs font-bold text-purple-700 ml-1">
              {tenant === 'wadaana' ? 'Packs' : '19L / Packs'}
            </span>
          </div>
          <div className="text-xs font-bold text-slate-500 mt-2 flex items-center gap-1">
            <Clock size={13} className="text-purple-600" />
            <span>{todaysProduction.batchesCount || 0} batches completed today</span>
          </div>
        </div>

        {/* Factory Stock */}
        <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-sm bg-blue-50/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700">Factory Floor Stock</span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Building size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-blue-950">
            {finishedGoods.reduce((sum, item) => sum + item.factoryQty, 0)}
            <span className="text-xs font-bold text-blue-700 ml-1">Units</span>
          </div>
          <div className="text-xs font-bold text-slate-500 mt-2">
            Available at factory for transfer
          </div>
        </div>

        {/* Raw Material Health Warnings */}
        <div className={`bg-white border rounded-2xl p-5 shadow-sm ${lowStockCount > 0 ? 'border-amber-300 bg-amber-50/40' : 'border-emerald-200 bg-emerald-50/30'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-extrabold uppercase tracking-wider ${lowStockCount > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
              Raw Material Health
            </span>
            <div className={`p-2 rounded-xl ${lowStockCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {lowStockCount > 0 ? lowStockCount : '100%'}
            <span className="text-xs font-bold text-slate-600 ml-1">
              {lowStockCount > 0 ? 'Low Stock Alerts' : 'Healthy Stock'}
            </span>
          </div>
          <div className="text-xs font-bold text-slate-500 mt-2">
            {lowStockCount > 0 ? `${lowStockCount} raw material(s) need refill` : 'All materials above threshold'}
          </div>
        </div>

        {/* Daily Close Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Daily Close Status</span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <Lock size={18} />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900">
            {dailyClose.isClosed ? (
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-xs font-black inline-flex items-center gap-1">
                <CheckCircle2 size={14} /> Finalized & Locked
              </span>
            ) : dailyClose.pmConfirmed ? (
              <span className="text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full text-xs font-black inline-flex items-center gap-1">
                <ShieldCheck size={14} /> Verified ✓ (Awaiting Admin)
              </span>
            ) : (
              <span className="text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full text-xs font-black inline-flex items-center gap-1">
                <Clock size={14} /> Pending PM Verification
              </span>
            )}
          </div>
          <div className="text-xs font-bold text-slate-500 mt-3">
            {pendingBatchesCount > 0 ? `${pendingBatchesCount} batch(es) pending completion` : 'No pending batches'}
          </div>
        </div>
      </div>

      {/* ── Main Workspace Grid (2 Columns) ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Production & Finished Goods (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Recent Production Batches */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Factory size={18} className="text-purple-600" />
                <h3 className="font-bold text-slate-800 text-sm">Recent Production Runs</h3>
              </div>
              <Link to="/production" className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-0.5">
                View All <ChevronRight size={14} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Batch ID</th>
                    <th className="p-3.5">Output Produced</th>
                    <th className="p-3.5">Waste/Breakage</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Logged By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {recentBatches.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-400">
                        No production runs logged today.
                      </td>
                    </tr>
                  ) : (
                    recentBatches.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-mono font-extrabold text-purple-700">{b.shortId}</td>
                        <td className="p-3.5 font-black text-slate-900">
                          {b.quantity > 0 && <span>+{b.quantity} 19L </span>}
                          {b.packs15L > 0 && <span className="text-purple-700 font-bold">+{b.packs15L} pk (1.5L) </span>}
                          {b.packs05L > 0 && <span className="text-sky-700 font-bold">+{b.packs05L} pk (0.5L) </span>}
                        </td>
                        <td className="p-3.5 font-bold text-rose-600">
                          {b.wasteQuantity > 0 ? `${b.wasteQuantity} units` : <span className="text-slate-400 font-normal">Clean</span>}
                        </td>
                        <td className="p-3.5">
                          {b.status === 'COMPLETED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Completed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-500 font-semibold">{b.createdBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Finished Goods Stock Breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-sky-600" />
                <h3 className="font-bold text-slate-800 text-sm">Finished Goods Stock Location Breakdown</h3>
              </div>
              <Link to="/finished-goods" className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-0.5">
                Manage Stock <ChevronRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {finishedGoods.map(fg => (
                <div key={fg.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="font-extrabold text-slate-800 text-sm">{fg.name}</div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>🏭 Factory Floor:</span>
                    <span className="font-bold text-slate-900">{fg.factoryQty} {fg.unit}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>🏢 Warehouse:</span>
                    <span className="font-bold text-purple-700">{fg.warehouseQty} {fg.unit}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between text-xs font-black text-slate-900">
                    <span>Total Fleet:</span>
                    <span className="text-sky-700">{fg.cachedQty} {fg.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Raw Materials & Purchasing (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Raw Material Inventory Health */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-600" />
                <h3 className="font-bold text-slate-800 text-sm">Raw Material Stock Health</h3>
              </div>
              <Link to="/raw-materials" className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-0.5">
                Master List <ChevronRight size={14} />
              </Link>
            </div>

            <div className="space-y-2.5">
              {rawMaterialHealth.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-6">No raw materials configured.</div>
              ) : (
                rawMaterialHealth.map(mat => (
                  <div key={mat.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 text-xs">{mat.name}</div>
                      <div className="text-[11px] text-slate-400">Reorder Level: {mat.reorderLevel} {mat.unit}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm">
                        {mat.cachedQty} <span className="text-xs font-normal text-slate-500">{mat.unit}</span>
                      </span>

                      {mat.status === 'OUT_OF_STOCK' && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 font-extrabold text-[10px] rounded-md">
                          OUT
                        </span>
                      )}
                      {mat.status === 'LOW_STOCK' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-[10px] rounded-md">
                          LOW
                        </span>
                      )}
                      {mat.status === 'IN_STOCK' && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[10px] rounded-md">
                          OK ✓
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Raw Material Purchases */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm">Recent Material Purchases</h3>
              </div>
              <Link to="/purchases" className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5">
                View Purchases <ChevronRight size={14} />
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentPurchases.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-6">No purchases logged recently.</div>
              ) : (
                recentPurchases.map(p => (
                  <div key={p.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between items-center font-bold text-slate-800">
                      <span>{p.vendorName}</span>
                      <span className="font-mono text-purple-700">{p.invoiceNo}</span>
                    </div>
                    <div className="text-slate-500 font-semibold flex justify-between">
                      <span>Received Items: {p.items.map(i => `${i.name} (${i.qty} ${i.unit})`).join(', ')}</span>
                      <span className="font-black text-slate-900">Rs {p.grandTotal.toLocaleString()}</span>
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
