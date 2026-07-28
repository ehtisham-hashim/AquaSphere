export { default } from '../features/dashboard/AdminDashboard';
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
