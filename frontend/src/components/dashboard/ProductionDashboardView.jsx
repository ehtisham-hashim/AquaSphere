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
import { useTenant } from '../../context/TenantContext';
import ProductionKPICards from './production/ProductionKPICards';
import ProductionChart from './production/ProductionChart';
import ProductionRecentRuns from './production/ProductionRecentRuns';
import FinishedGoodsBreakdown from './production/FinishedGoodsBreakdown';
import RawMaterialHealthPanel from './production/RawMaterialHealthPanel';

export default function ProductionDashboardView() {
  const { tenant, isWadaana } = useTenant();
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
    <div className="space-y-6 pb-6 text-slate-800">
      {/* Header Banner */}
      <div className="card-surface p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-brand">
              {companyTitle} • OPERATIONS
            </span>
            <span className="text-xs text-slate-400 font-medium">Production Control</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Factory className="w-6 h-6 text-brand" /> Production & Inventory Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time monitoring of factory runs, finished goods stock, and raw material health.
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/production" className="btn-primary text-xs">
            <Plus size={15} /> Log Batch
          </Link>
          <Link to="/inventory" className="btn-secondary text-xs">
            <ArrowRightLeft size={15} className="text-slate-400" /> Transfer Stock
          </Link>
          <Link to="/purchases" className="btn-secondary text-xs">
            <ShoppingCart size={15} className="text-slate-400" /> Record Purchase
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
