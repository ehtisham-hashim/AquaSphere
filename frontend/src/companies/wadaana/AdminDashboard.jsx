import React, { useEffect, useState } from 'react';
import { 
  Lock, 
  Unlock, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Package, 
  Truck, 
  Factory, 
  Banknote, 
  ShieldAlert, 
  Users, 
  Clock,
  RefreshCw
} from 'lucide-react';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [cashData, setCashData] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const tenant = localStorage.getItem('tenant') || 'aquasphere';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashRes, cashRes, alertRes] = await Promise.all([
        fetch('/api/admin/dashboard', { headers: { 'x-tenant': tenant }, credentials: 'include' }),
        fetch('/api/admin/cash-summary', { headers: { 'x-tenant': tenant }, credentials: 'include' }),
        fetch('/api/admin/customer-alerts', { headers: { 'x-tenant': tenant }, credentials: 'include' })
      ]);

      const dashJson = await dashRes.json();
      const cashJson = await cashRes.json();
      const alertJson = await alertRes.json();

      if (dashJson.success) setData(dashJson.data);
      if (cashJson.success) setCashData(cashJson.data);
      if (alertJson.success) setAlerts(alertJson.data);
    } catch (err) {
      console.error('Error loading admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCloseDay = async () => {
    if (!window.confirm('Are you sure you want to CLOSE the day? This will lock all daily transactions.')) return;
    setClosing(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/daily-close/close', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant': tenant 
        },
        credentials: 'include',
        body: JSON.stringify({ date: todayStr })
      });
      const json = await res.json();
      if (json.success) {
        alert('Day closed successfully! Operational records locked.');
        fetchData();
      } else {
        alert(json.message || 'Failed to close day');
      }
    } catch (err) {
      alert('Error closing day');
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading Supervisor Dashboard...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              SUPERVISOR VIEW
            </span>
            <span className="text-xs text-slate-400">Strict Read-Only Mode (No Financial Margins)</span>
          </div>
          <h1 className="text-2xl font-bold mt-1">Admin Operations Control</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Monitor daily stock, production output, delivery status, and perform daily lock verification without changing financial margins.
          </p>
        </div>

        {/* Feature 3: Daily Close Verification & Lock */}
        <div className="flex items-center gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-medium">Daily Close Lock</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {kpis.isDayClosed ? (
                <>
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">LOCKED</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-400">OPEN</span>
                </>
              )}
            </div>
          </div>

          {!kpis.isDayClosed ? (
            <button
              onClick={handleCloseDay}
              disabled={closing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-lg shadow transition flex items-center gap-2 disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              {closing ? 'Locking...' : 'Close & Lock Day'}
            </button>
          ) : (
            <div className="text-xs text-slate-400 pl-2 border-l border-slate-700">
              Closed by: <span className="font-semibold text-slate-200">{kpis.dayClosedBy || 'Admin'}</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Orders</p>
            <h3 className="text-2xl font-bold text-slate-900">{kpis.todaysOrdersCount || 0}</h3>
            <p className="text-xs text-amber-600 font-medium mt-0.5">{kpis.pendingOrdersCount || 0} Pending Delivery</p>
          </div>
        </div>

        {/* Today's Production Yield */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Factory className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Good Yield Today</p>
            <h3 className="text-2xl font-bold text-slate-900">{kpis.totalGoodYield || 0} units</h3>
            <p className="text-xs text-rose-500 font-medium mt-0.5">{kpis.totalWaste || 0} units waste</p>
          </div>
        </div>

        {/* Cash Collections (No Profit/Cost) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cash Collected</p>
            <h3 className="text-2xl font-bold text-slate-900 font-mono">Rs. {(kpis.cashCollected || 0).toLocaleString()}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Orders + Spot Sales</p>
          </div>
        </div>

        {/* Customer Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Alerts</p>
            <h3 className="text-2xl font-bold text-slate-900">{alerts?.totalAlerts || 0}</h3>
            <p className="text-xs text-amber-600 font-medium mt-0.5">
              {alerts?.creditBreaches?.length || 0} Credit / {alerts?.inactiveCustomers?.length || 0} Inactive
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="border-b border-slate-200 flex gap-4">
        {[
          { id: 'overview', label: 'Inventory & Production' },
          { id: 'orders', label: 'Order Tracking' },
          { id: 'cash', label: 'Cash Summary' },
          { id: 'alerts', label: 'Customer Alerts' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Inventory & Production */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stock Counts */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-slate-600" />
              Raw Materials & Stock Levels
            </h3>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {data?.inventory?.rawMaterials?.map(item => (
                <div key={item.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-semibold text-slate-800">{item.name}</span>
                    <span className="text-xs text-slate-400 ml-2">Reorder: {item.reorderLevel} {item.unit}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono font-bold ${item.isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                      {item.cachedQty} {item.unit}
                    </span>
                    {item.isLow && (
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-xs font-semibold rounded-md">
                        LOW STOCK
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Production Batches */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Factory className="w-5 h-5 text-slate-600" />
              Today's Production Batches
            </h3>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {data?.productionTable?.length === 0 ? (
                <p className="text-sm text-slate-400 py-4">No production logged today.</p>
              ) : (
                data?.productionTable?.map(b => (
                  <div key={b.id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-semibold text-slate-800">{b.outputItem}</span>
                      <span className="text-xs text-slate-400 block">{b.shortId}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-emerald-600 block">{b.goodYield} Good</span>
                      {b.waste > 0 && <span className="text-xs text-rose-500 font-medium">{b.waste} Waste</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Order Tracking */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Today's Orders Status</h3>
            <span className="text-xs text-slate-500 font-medium">Read-Only Operational View</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Item</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.ordersTable?.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-4 text-center text-slate-400">No orders recorded today.</td>
                  </tr>
                ) : (
                  data?.ordersTable?.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-medium text-slate-700">{o.shortId}</td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-800">{o.customer}</span>
                        <span className="text-xs text-slate-400 block">{o.phone}</span>
                      </td>
                      <td className="p-3 font-medium text-slate-600">{o.type}</td>
                      <td className="p-3 text-slate-700">{o.itemName}</td>
                      <td className="p-3 font-bold text-slate-800">{o.quantity}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          o.deliveryStatus === 'DELIVERED' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {o.deliveryStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Cash Summary (No Profit/COGS) */}
      {activeTab === 'cash' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Cash Collections Overview</h3>
            <p className="text-sm text-slate-500">Summary of actual cash collected from customer payments and counter sales.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium uppercase">Total Cash In</span>
              <p className="text-2xl font-bold text-slate-900 font-mono mt-1">
                Rs. {cashData?.totalCashCollected?.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium uppercase">From Customer Orders</span>
              <p className="text-2xl font-bold text-blue-600 font-mono mt-1">
                Rs. {cashData?.fromOrders?.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium uppercase">From Counter / Spot Sales</span>
              <p className="text-2xl font-bold text-purple-600 font-mono mt-1">
                Rs. {cashData?.fromSpotSales?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Customer Alerts */}
      {activeTab === 'alerts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Credit Limit Breaches */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Credit Limit Breaches
            </h3>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {alerts?.creditBreaches?.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">No credit limit breaches detected.</p>
              ) : (
                alerts?.creditBreaches?.map(c => (
                  <div key={c.id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-semibold text-slate-800">{c.name}</span>
                      <span className="text-xs text-slate-400 block">{c.phone}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-rose-600 block">Rs. {c.balance.toLocaleString()}</span>
                      <span className="text-xs text-slate-400">Limit: Rs. {c.creditLimit.toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Inactive Customers (>7 Days) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Inactive Customers ({'>'}7 Days)
            </h3>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {alerts?.inactiveCustomers?.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">No inactive customers.</p>
              ) : (
                alerts?.inactiveCustomers?.map(c => (
                  <div key={c.id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-semibold text-slate-800">{c.name}</span>
                      <span className="text-xs text-slate-400 block">{c.phone}</span>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-semibold text-xs rounded-md">
                        {c.daysSinceLastOrder} days inactive
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
