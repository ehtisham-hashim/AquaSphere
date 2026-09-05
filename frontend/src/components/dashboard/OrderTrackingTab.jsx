export default function OrderTrackingTab({ orders = [] }) {
  return (
    <div className="card-surface overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Today&apos;s Orders Status</h3>
          <p className="text-[11px] text-slate-500 font-medium">Live operational tracking across delivery routes and pickup</p>
        </div>
        <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[10px] text-slate-600 font-mono font-bold">
          {orders.length} Order(s) Today
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr>
              <th className="table-th">Order ID</th>
              <th className="table-th">Customer</th>
              <th className="table-th">Type</th>
              <th className="table-th">Item</th>
              <th className="table-th">Qty</th>
              <th className="table-th">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {orders.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-400">
                  No orders recorded today yet.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-indigo-600">{o.shortId || `#${o.id.slice(0, 6).toUpperCase()}`}</td>
                  <td className="p-3.5">
                    <span className="font-semibold text-slate-800 block">{o.customer}</span>
                    <span className="text-xs text-slate-400 block">{o.phone}</span>
                  </td>
                  <td className="p-3.5 font-medium text-slate-600">{o.type}</td>
                  <td className="p-3.5 text-slate-700 font-medium">{o.itemName}</td>
                  <td className="p-3.5 font-bold text-slate-800">{o.quantity}</td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      o.deliveryStatus === 'DELIVERED' 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : o.deliveryStatus === 'CANCELLED'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
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
  );
}
