import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Car, 
  Fuel, 
  Calendar, 
  CheckCircle2, 
  RefreshCw, 
  ArrowRight, 
  Receipt,
  Truck,
  RotateCcw,
  Clock,
  PackageCheck
} from 'lucide-react';
import { API_URL } from '../../utils/api';
import { useTenant } from '../../context/TenantContext';
import { TimeframeDropdown } from '../ui';

// ponytail: lean TM dashboard - fleet metrics, fuel/maintenance, vehicle status & delivery queue
export default function TransportDashboardView() {
  const { tenant, isWadaana } = useTenant();
  const [timeframe, setTimeframe] = useState('1_MONTH');
  const [vehicles, setVehicles] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [vehRes, expRes, ordRes] = await Promise.all([
        fetch(`${API_URL}/vehicles`, {
          headers: { 'x-tenant': tenant },
          credentials: 'include'
        }),
        fetch(`${API_URL}/transport-expenses?limit=100`, {
          headers: { 'x-tenant': tenant },
          credentials: 'include'
        }).catch(() => null),
        fetch(`${API_URL}/orders?limit=50`, {
          headers: { 'x-tenant': tenant },
          credentials: 'include'
        }).catch(() => null)
      ]);

      const [vehJson, expJson, ordJson] = await Promise.all([
        vehRes ? vehRes.json().catch(() => ({})) : {},
        expRes ? expRes.json().catch(() => ({})) : {},
        ordRes ? ordRes.json().catch(() => ({})) : {}
      ]);

      if (vehJson.success) setVehicles(vehJson.data || []);
      
      let expList = [];
      if (expJson.success && Array.isArray(expJson.data)) {
        expList = expJson.data;
      }
      // If transport expenses empty, fallback to general expenses
      if (expList.length === 0) {
        try {
          const genRes = await fetch(`${API_URL}/expenses?limit=50`, {
            headers: { 'x-tenant': tenant },
            credentials: 'include'
          });
          const genJson = await genRes.json();
          if (genJson.success) {
            const raw = genJson.data?.expenses || genJson.data || [];
            expList = Array.isArray(raw) ? raw : [];
          }
        } catch (_err) {
          // ignore general expense fetch error
        }
      }
      setExpenses(expList);

      if (ordJson.success) {
        setOrders(ordJson.data || []);
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

  const _todayVehicleExpenses = useMemo(() => {
    return expenses
      .filter(e => {
        const d = new Date(e.date || e.createdAt);
        return d.toISOString().slice(0, 10) === todayStr;
      })
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses, todayStr]);

  const _monthVehicleExpenses = useMemo(() => {
    return expenses
      .filter(e => {
        const d = new Date(e.date || e.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses, currentMonth, currentYear]);

  const timeframeVehicleExpenses = useMemo(() => {
    const dNow = new Date();
    let startDate = new Date(dNow.getFullYear(), dNow.getMonth(), dNow.getDate(), 0, 0, 0);
    if (timeframe === 'YESTERDAY') {
      startDate = new Date(dNow.getFullYear(), dNow.getMonth(), dNow.getDate() - 1, 0, 0, 0);
    } else if (timeframe === 'LAST_3_DAYS') {
      startDate = new Date(dNow.getFullYear(), dNow.getMonth(), dNow.getDate() - 2, 0, 0, 0);
    } else if (timeframe === '1_WEEK') {
      startDate = new Date(dNow.getFullYear(), dNow.getMonth(), dNow.getDate() - 6, 0, 0, 0);
    } else if (timeframe === '1_MONTH') {
      startDate = new Date(dNow.getFullYear(), dNow.getMonth(), 1, 0, 0, 0);
    } else if (timeframe === '1_YEAR') {
      startDate = new Date(dNow.getFullYear(), 0, 1, 0, 0, 0);
    }
    const endOfDay = new Date(dNow.getFullYear(), dNow.getMonth(), dNow.getDate(), 23, 59, 59, 999);

    return expenses
      .filter(e => {
        const d = new Date(e.date || e.createdAt);
        return d >= startDate && d <= endOfDay;
      })
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses, timeframe]);

  const getPeriodLabel = () => {
    if (timeframe === 'DAILY' || timeframe === 'TODAY') return 'Today';
    if (timeframe === 'YESTERDAY') return 'Yesterday';
    if (timeframe === 'LAST_3_DAYS') return 'Past 3 Days';
    if (timeframe === '1_WEEK') return 'This Week';
    if (timeframe === '1_YEAR') return 'This Year';
    return 'This Month';
  };

  // Delivery & Dispatch metrics
  const pendingDeliveries = useMemo(() => {
    return orders.filter(o => o.deliveryStatus === 'PENDING' || o.deliveryStatus === 'PARTIAL');
  }, [orders]);

  const _todayDeliveredCount = useMemo(() => {
    return orders.filter(o => {
      if (o.deliveryStatus !== 'DELIVERED') return false;
      const d = new Date(o.updatedAt || o.createdAt);
      return d.toISOString().slice(0, 10) === todayStr;
    }).length;
  }, [orders, todayStr]);

  const todayBottlesRecovered = useMemo(() => {
    let count = 0;
    orders.forEach(o => {
      (o.deliveries || []).forEach(d => {
        const delDate = new Date(d.deliveredAt || o.updatedAt);
        if (delDate.toISOString().slice(0, 10) === todayStr) {
          count += Number(d.bottlesReturnedGood || 0) + Number(d.bottlesReturnedBroken || 0);
        }
      });
    });
    return count;
  }, [orders, todayStr]);

  // Filter expenses that have vehicle attached or fuel/repairs
  const recentVehicleExpenses = useMemo(() => {
    return expenses
      .filter(e => e.vehicle || e.vehicleId || ['DAILY', 'REPAIRS', 'OTHER', 'Fuel / Transport', 'Fuel', 'Vehicle Repairs', 'Maintenance'].includes(e.type || e.category))
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
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium">Timeframe:</span>
            <TimeframeDropdown value={timeframe} onChange={setTimeframe} />
          </div>

          <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />

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

      {/* KPI Cards Grid (4 Clean Operational Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Fleet Readiness */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-brand-primary/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fleet Readiness</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-slate-800 font-mono">
              {activeVehicles.length} / {totalVehicles}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-bold">{operationalRate}% ready</span>
              <span>•</span>
              <span className="text-slate-400">{totalVehicles - activeVehicles.length} off-road</span>
            </div>
          </div>
        </div>

        {/* Pending Dispatches */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-brand-primary/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Dispatches</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={15} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-amber-600 font-mono">{pendingDeliveries.length}</div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1">
              Orders awaiting route delivery
            </div>
          </div>
        </div>

        {/* Today's Bottle Recoveries */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-brand-primary/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bottles Returned</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <RotateCcw size={15} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-teal-600 font-mono">{todayBottlesRecovered}</div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1">
              Recovered from customer routes today
            </div>
          </div>
        </div>

        {/* Transport & Fuel Spend */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-brand-primary/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Transport Spend</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Fuel size={15} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-slate-800 font-mono">
              Rs. {Math.round(timeframeVehicleExpenses).toLocaleString()}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1 flex items-center gap-1">
              <span>{getPeriodLabel()} Spend</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Section: Fleet Status & Recent Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Fleet Status & Pending Delivery Dispatches (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Fleet Status Overview */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Fleet Status Overview</h2>
                <p className="text-xs text-slate-500">Live operational status across all delivery vehicles</p>
              </div>
              <Link
                to="/transport"
                className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
              >
                View All Fleet <ArrowRight size={12} />
              </Link>
            </div>

            <div className="p-4">
              {vehicles.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
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
                      className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 transition-all flex items-start justify-between"
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

          {/* Pending Delivery Dispatches Queue */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-800">Pending Delivery Orders</h2>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full">
                    {pendingDeliveries.length} Pending
                  </span>
                </div>
                <p className="text-xs text-slate-500">Orders awaiting route dispatch & delivery execution</p>
              </div>
              <Link
                to="/orders"
                className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
              >
                Go to Orders <ArrowRight size={12} />
              </Link>
            </div>

            <div className="p-4">
              {pendingDeliveries.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <PackageCheck size={32} className="mx-auto mb-2 text-emerald-500 opacity-60" />
                  <p className="text-sm font-semibold text-slate-700">All dispatches up to date!</p>
                  <p className="text-xs text-slate-400 mt-0.5">No pending customer delivery orders.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingDeliveries.slice(0, 5).map(o => (
                    <div
                      key={o.id}
                      className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-50 flex items-center justify-between transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800">
                            {o.customer?.name || 'Customer'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                            {o.deliveryStatus}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[280px]">
                          {o.customer?.address || 'No delivery address recorded'}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span>Items: {(o.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0)} bottles</span>
                          <span>•</span>
                          <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <Link
                        to="/orders"
                        className="px-2.5 py-1 text-xs font-bold text-brand-primary bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        Dispatch
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Vehicle Expenses & Quick Links (1 Column) */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-2.5">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-2">
              <Link
                to="/transport-expenses"
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-brand-primary/40 hover:bg-brand-primary/5 transition-all text-xs font-bold text-slate-700"
              >
                <div className="flex items-center gap-2">
                  <Fuel size={14} className="text-amber-500" />
                  <span>Log Vehicle / Fuel Expense</span>
                </div>
                <ArrowRight size={13} className="text-slate-400" />
              </Link>
              <Link
                to="/transport"
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-brand-primary/40 hover:bg-brand-primary/5 transition-all text-xs font-bold text-slate-700"
              >
                <div className="flex items-center gap-2">
                  <Car size={14} className="text-blue-500" />
                  <span>Fleet Vehicle Management</span>
                </div>
                <ArrowRight size={13} className="text-slate-400" />
              </Link>
              <Link
                to="/orders"
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-brand-primary/40 hover:bg-brand-primary/5 transition-all text-xs font-bold text-slate-700"
              >
                <div className="flex items-center gap-2">
                  <Truck size={14} className="text-emerald-500" />
                  <span>Dispatch & Delivery Routes</span>
                </div>
                <ArrowRight size={13} className="text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Recent Vehicle Expenses */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Recent Vehicle Expenses</h2>
                <p className="text-xs text-slate-500">Latest transport & fuel logs</p>
              </div>
              <Link
                to="/transport-expenses"
                className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
              >
                All Logs <ArrowRight size={12} />
              </Link>
            </div>

            <div className="p-4 flex-1">
              {recentVehicleExpenses.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
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
                            {ex.vehicle?.name || ex.vehicle?.plateNumber || ex.type || ex.category}
                          </span>
                          {ex.vehicle?.plateNumber && (
                            <span className="text-[10px] font-mono text-slate-400">
                              ({ex.vehicle.plateNumber})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
                          {ex.note || ex.remarks || ex.type || ex.category}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(ex.date || ex.createdAt).toLocaleDateString()}
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
    </div>
  );
}
