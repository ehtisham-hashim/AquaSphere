import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Lock, 
  Package, 
  Truck, 
  Factory, 
  Banknote, 
  ShieldAlert, 
  RefreshCw,
  AlertTriangle, 
  UserX, 
  CreditCard 
} from 'lucide-react';
import { getCompanyFromCookie } from '../../utils/companyCookie';
import { API_URL as API } from '../../utils/api';

export default function AdminDashboardView() {
  const tenant = getCompanyFromCookie();
  const [data, setData] = useState(null);
  const [cashData, setCashData] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const companyTitle = tenant === 'wadaana' ? 'Wadaana Industries' : 'AquaSphere';

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'x-tenant': tenant };
      const [dashRes, cashRes, alertRes] = await Promise.all([
        fetch(`${API}/admin/dashboard?tenant=${tenant}`, { headers, credentials: 'include' }),
        fetch(`${API}/admin/cash-summary?tenant=${tenant}`, { headers, credentials: 'include' }),
        fetch(`${API}/admin/customer-alerts?tenant=${tenant}`, { headers, credentials: 'include' })
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
  }, [tenant]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading Supervisor Dashboard...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
              {companyTitle.toUpperCase()} • SUPERVISOR VIEW
            </span>
            <span className="text-xs text-slate-400 font-medium">Read-Only Operations Control</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1 text-slate-900">Admin Operations Control</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor daily stock levels, production output, delivery status, cash collections, and customer credit alerts.
          </p>
        </div>

        <Link to="/daily-close" className="flex items-center gap-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold transition-all shadow-sm">
          <Lock className="w-4 h-4 text-emerald-500" />
          <span>Go to Daily Close Page &rarr;</span>
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Today's Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Today&apos;s Orders</p>
            <h3 className="text-2xl font-black text-slate-900">{kpis.todaysOrdersCount || 0}</h3>
            <p className="text-xs text-amber-600 font-bold mt-0.5">{kpis.pendingOrdersCount || 0} Pending Delivery</p>
          </div>
        </div>

        {/* Today's Production Yield */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Factory className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              {tenant === 'wadaana' ? 'Good Yield Today' : 'Production Output'}
            </p>
            {tenant === 'wadaana' ? (
              <>
                <h3 className="text-2xl font-black text-slate-900">{kpis.totalGoodYield || 0} units</h3>
                <p className="text-xs text-rose-500 font-bold mt-0.5">{kpis.totalWaste || 0} units waste</p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-black text-slate-900">
                  0.5L: {kpis.packs05LToday || 0} / 1.5L: {kpis.packs15LToday || 0}
                </h3>
                <p className="text-xs text-rose-500 font-bold mt-0.5">{kpis.totalWaste || 0} units waste</p>
              </>
            )}
          </div>
        </div>

        {/* Stock Health */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className={`p-3 rounded-xl ${kpis.lowStockAlerts > 0 ? 'bg-rose-50 text-rose-600' : 'bg-teal-50 text-teal-600'}`}>
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Stock Health</p>
            <h3 className={`text-xl font-black ${kpis.lowStockAlerts > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {kpis.lowStockAlerts > 0 ? `${kpis.lowStockAlerts} Low` : 'All Healthy'}
            </h3>
            <p className="text-xs text-slate-500 font-bold mt-0.5">Raw Material Status</p>
          </div>
        </div>

        {/* Cash Collected Indicator */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Cash Collected</p>
            <h3 className="text-xl font-black text-slate-900 font-mono">Rs. {(kpis.cashCollected || 0).toLocaleString()}</h3>
            <p className="text-xs text-indigo-600 font-bold mt-0.5">Orders + Counter Sales</p>
          </div>
        </div>

        {/* Customer Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Active Alerts</p>
            <h3 className="text-2xl font-black text-slate-900">{alerts?.totalAlerts || 0}</h3>
            <p className="text-xs text-amber-600 font-bold mt-0.5">
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
            className={`pb-3 text-xs md:text-sm font-bold border-b-2 transition ${
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
              {data?.inventory?.rawMaterials?.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No raw materials configured.</p>
              ) : (
                data?.inventory?.rawMaterials?.map(item => (
                  <div key={item.id} className="py-3 flex items-center justify-between text-xs md:text-sm">
                    <div>
                      <span className="font-bold text-slate-800">{item.name}</span>
                      <span className="text-xs text-slate-400 ml-2">Reorder: {item.reorderLevel} {item.unit}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold ${item.isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                        {item.cachedQty} {item.unit}
                      </span>
                      {item.isLow && (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-black rounded-md uppercase">
                          LOW STOCK
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Today's Production Batches */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Factory className="w-5 h-5 text-slate-600" />
              Today&apos;s Production Batches
            </h3>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {data?.productionTable?.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No production logged today.</p>
              ) : (
                data?.productionTable?.map(b => (
                  <div key={b.id} className="py-3 flex items-center justify-between text-xs md:text-sm">
                    <div>
                      <span className="font-bold text-slate-800">{b.outputItem}</span>
                      <span className="text-xs text-slate-400 block font-mono">{b.shortId}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-600 block">{b.goodYield} Good</span>
                      {b.waste > 0 && <span className="text-xs text-rose-500 font-bold">{b.waste} Waste</span>}
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
            <h3 className="font-bold text-slate-800 text-sm">Today&apos;s Orders Status</h3>
            <span className="text-xs text-slate-500 font-medium">Read-Only Operational View</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Item</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {data?.ordersTable?.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-slate-400">No orders recorded today.</td>
                  </tr>
                ) : (
                  data?.ordersTable?.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-purple-700">{o.shortId}</td>
                      <td className="p-3">
                        <span className="font-bold text-slate-800">{o.customer}</span>
                        <span className="text-xs text-slate-400 block">{o.phone}</span>
                      </td>
                      <td className="p-3 font-medium text-slate-600">{o.type}</td>
                      <td className="p-3 text-slate-700">{o.itemName}</td>
                      <td className="p-3 font-black text-slate-900">{o.quantity}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                          o.deliveryStatus === 'DELIVERED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : o.deliveryStatus === 'CANCELLED'
                            ? 'bg-slate-100 text-slate-500'
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

      {/* Tab 3: Cash Summary */}
      {activeTab === 'cash' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Cash Collections Overview</h3>
            <p className="text-xs text-slate-500">Summary of actual cash collected from customer payments and counter sales.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Cash In</span>
              <p className="text-2xl font-black text-slate-900 font-mono mt-1">
                Rs. {cashData?.totalCashCollected?.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">From Customer Orders</span>
              <p className="text-2xl font-black text-blue-600 font-mono mt-1">
                Rs. {cashData?.fromOrders?.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">From Counter / Spot Sales</span>
              <p className="text-2xl font-black text-purple-600 font-mono mt-1">
                Rs. {cashData?.fromSpotSales?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Customer Alerts */}
      {activeTab === 'alerts' && (
        <div className="space-y-6 pt-2">
          {!alerts || alerts.totalAlerts === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
              <ShieldAlert className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-slate-500 font-bold text-xs">No customer alerts right now</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Credit Limit Breaches */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <CreditCard className="w-4 h-4 text-rose-500" />
                  Credit Limit Breaches ({alerts.creditBreaches?.length || 0})
                </h4>
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {alerts.creditBreaches?.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">None</p>
                  ) : (
                    alerts.creditBreaches?.map(c => (
                      <div key={c.id} className="py-2 text-xs">
                        <p className="font-bold text-slate-800">{c.name}</p>
                        <p className="text-[11px] text-slate-500">{c.phone}</p>
                        <p className="text-xs text-rose-600 font-bold">Balance: Rs. {c.currentBalance?.toLocaleString()} / Limit: Rs. {c.creditLimit?.toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Unpaid Bills > 7 Days */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Unpaid Bills &gt; 7 Days ({alerts.unpaidBillOver7Days?.length || 0})
                </h4>
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {alerts.unpaidBillOver7Days?.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">None</p>
                  ) : (
                    alerts.unpaidBillOver7Days?.map(c => (
                      <div key={c.id} className="py-2 text-xs">
                        <p className="font-bold text-slate-800">{c.name}</p>
                        <p className="text-[11px] text-slate-500">{c.phone}</p>
                        <p className="text-xs text-amber-600 font-bold">Rs. {c.unpaidAmount?.toLocaleString()} — {c.daysOverdue} days overdue</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Inactive Customers */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <UserX className="w-4 h-4 text-slate-500" />
                  Inactive Customers ({alerts.inactiveCustomers?.length || 0})
                </h4>
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {alerts.inactiveCustomers?.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">None</p>
                  ) : (
                    alerts.inactiveCustomers?.map(c => (
                      <div key={c.id} className="py-2 text-xs">
                        <p className="font-bold text-slate-800">{c.name}</p>
                        <p className="text-[11px] text-slate-500">{c.phone}</p>
                        <p className="text-xs text-slate-600 font-bold">{c.daysSinceLastOrder} days since last order</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
