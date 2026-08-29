import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  ArrowRightLeft, 
  ShoppingCart, 
  AlertTriangle, 
  Factory, 
  RefreshCw 
} from 'lucide-react';
import { API_URL as API } from '../../utils/api';
import { getCompanyFromCookie } from '../../utils/companyCookie';
import ProductionKPICards from './production/ProductionKPICards';
import ProductionChart from './production/ProductionChart';
import ProductionRecentRuns from './production/ProductionRecentRuns';
import FinishedGoodsBreakdown from './production/FinishedGoodsBreakdown';
import RawMaterialHealthPanel from './production/RawMaterialHealthPanel';

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
      <ProductionKPICards
        todaysProduction={todaysProduction}
        finishedGoods={finishedGoods}
        lowStockCount={lowStockCount}
        dailyClose={dailyClose}
        pendingBatchesCount={pendingBatchesCount}
        isWadaana={isWadaana}
      />

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          <ProductionChart
            chartData={chartData}
            selectedDays={selectedDays}
            setSelectedDays={setSelectedDays}
            isWadaana={isWadaana}
          />
          <ProductionRecentRuns
            recentBatches={recentBatches}
            isWadaana={isWadaana}
          />
          <FinishedGoodsBreakdown
            finishedGoods={finishedGoods}
          />
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          <RawMaterialHealthPanel
            sortedRawMaterials={sortedRawMaterials}
            recentPurchases={recentPurchases}
          />
        </div>
      </div>
    </div>
  );
}
