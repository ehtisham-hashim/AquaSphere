import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Car, 
  Fuel, 
  Calendar, 
  CheckCircle2, 
  RefreshCw, 
  ArrowRight,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { API_URL } from '../../utils/api';
import { useTenant } from '../../context/TenantContext';

// ponytail: lean TM dashboard - fleet metrics, fuel/maintenance, vehicle status
export default function TransportDashboardView() {
  const { tenant, isWadaana } = useTenant();
  const [vehicles, setVehicles] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [vehRes, expRes] = await Promise.all([
        fetch(`${API_URL}/vehicles`, {
          headers: { 'x-tenant': tenant },
          credentials: 'include'
        }),
        fetch(`${API_URL}/expenses?limit=50`, {
          headers: { 'x-tenant': tenant },
          credentials: 'include'
        })
      ]);

      const [vehJson, expJson] = await Promise.all([vehRes.json(), expRes.json()]);

      if (vehJson.success) setVehicles(vehJson.data || []);
      if (expJson.success) {
        const raw = expJson.data?.expenses || expJson.data || [];
        setExpenses(Array.isArray(raw) ? raw : []);
      }
    } catch (err) {
      console.error('Failed to load transport dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenant]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived metrics
  const activeVehicles = useMemo(() => vehicles.filter(v => v.isActive), [vehicles]);
  const totalVehicles = vehicles.length;
  const operationalRate = totalVehicles > 0 ? Math.round((activeVehicles.length / totalVehicles) * 100) : 0;

  // Expense calculations
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const todayVehicleExpenses = useMemo(() => {
    return expenses
      .filter(e => {
        const d = new Date(e.createdAt || e.date);
        return d.toISOString().slice(0, 10) === todayStr;
      })
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses, todayStr]);

  const monthVehicleExpenses = useMemo(() => {
    return expenses
      .filter(e => {
        const d = new Date(e.createdAt || e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses, currentMonth, currentYear]);

  // Filter expenses that have vehicle attached or fuel/repairs
  const recentVehicleExpenses = useMemo(() => {
    return expenses
      .filter(e => e.vehicle || e.vehicleId || ['Fuel / Transport', 'Fuel', 'Vehicle Repairs', 'Vehicle Repair', 'Maintenance'].includes(e.category))
      .slice(0, 6);
  }, [expenses]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-lg w-1/3"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl border border-slate-200"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-slate-100 rounded-xl"></div>
          <div className="h-72 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Car className="text-brand-primary" size={22} />
            Transport & Fleet Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active fleet monitoring, fuel usage, and maintenance logs for {isWadaana ? 'Wadaana' : 'AquaSphere'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
            title="Refresh dashboard data"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-brand-primary' : ''} />
            Refresh
          </button>
          <Link
            to="/transport"
            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
          >
            Manage Transport <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Fleet */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-brand-primary/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Fleet</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Car size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-800 font-mono">{totalVehicles}</div>
            <div className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-bold">{activeVehicles.length} active</span>
              <span>•</span>
              <span className="text-slate-400">{totalVehicles - activeVehicles.length} inactive</span>
            </div>
          </div>
        </div>

        {/* Operational Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-brand-primary/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operational Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-600 font-mono">{operationalRate}%</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">
              {activeVehicles.length} of {totalVehicles} vehicles road-ready
            </div>
          </div>
        </div>

        {/* Today's Vehicle Expenses */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-brand-primary/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Expenses</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Fuel size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-800 font-mono">
              Rs. {Math.round(todayVehicleExpenses).toLocaleString()}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
              <Calendar size={12} className="text-slate-400" />
              <span>Fuel & maintenance today</span>
            </div>
          </div>
        </div>

        {/* Month's Transport Spend */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-brand-primary/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Month Spend</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-800 font-mono">
              Rs. {Math.round(monthVehicleExpenses).toLocaleString()}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-1">
              MTD fleet operations total
            </div>
          </div>
        </div>
      </div>

      {/* Main Section: Fleet Status & Recent Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicles Grid / Overview (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Fleet Status Overview</h2>
              <p className="text-xs text-slate-500">Live operational status across all vehicles</p>
            </div>
            <Link
              to="/transport"
              className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
            >
              View All Fleet <ArrowRight size={12} />
            </Link>
          </div>

          <div className="p-4 flex-1">
            {vehicles.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Car size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">No vehicles registered yet</p>
                <Link to="/transport" className="text-xs text-brand-primary underline mt-1 inline-block">
                  Add vehicle in Transport
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {vehicles.map(v => (
                  <div 
                    key={v.id} 
                    className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 transition-all flex items-start justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${v.isActive ? 'bg-blue-50 text-brand-primary' : 'bg-slate-100 text-slate-400'}`}>
                        <Car size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{v.name}</div>
                        <div className="font-mono text-xs font-semibold text-slate-500 mt-0.5">{v.plateNumber}</div>
                        {v.model && (
                          <div className="text-[11px] text-slate-400 mt-0.5">{v.model}</div>
                        )}
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      v.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {v.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Vehicle Expenses (1 Column) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Recent Vehicle Expenses</h2>
              <p className="text-xs text-slate-500">Latest transport & fuel logs</p>
            </div>
            <Link
              to="/transport"
              className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
            >
              All Logs <ArrowRight size={12} />
            </Link>
          </div>

          <div className="p-4 flex-1">
            {recentVehicleExpenses.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Receipt size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">No recent vehicle expenses</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentVehicleExpenses.map(ex => (
                  <div 
                    key={ex.id}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">
                          {ex.vehicle?.name || ex.vehicle?.plateNumber || ex.category}
                        </span>
                        {ex.vehicle?.plateNumber && (
                          <span className="text-[10px] font-mono text-slate-400">
                            ({ex.vehicle.plateNumber})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                        {ex.remarks || ex.category}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(ex.createdAt || ex.date).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black font-mono text-xs text-brand-primary">
                        Rs. {Math.round(Number(ex.amount || 0)).toLocaleString()}
                      </div>
                      {ex.receiptUrl && (
                        <a 
                          href={ex.receiptUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[10px] font-bold text-blue-600 hover:underline inline-block mt-0.5"
                        >
                          Receipt
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
