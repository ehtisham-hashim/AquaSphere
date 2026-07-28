import { Clock, Truck, CheckCircle } from 'lucide-react';

const deliveryBadge = (s) => {
  const map = {
    PENDING: 'bg-amber-100 text-amber-700',
    DELIVERED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-red-100 text-red-700',
    PARTIAL: 'bg-blue-100 text-blue-700',
  };
  return map[s] || 'bg-slate-100 text-slate-600';
};

const paymentBadge = (s) => {
  const map = {
    UNPAID: 'bg-red-100 text-red-700',
    PAID: 'bg-emerald-100 text-emerald-700',
    PARTIAL: 'bg-amber-100 text-amber-700',
  };
  return map[s] || 'bg-slate-100 text-slate-600';
};

export default function OrdersTable({ orders, isLoading, onProcess, showCustomerName }) {
  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-sm">Loading orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400">
        <CheckCircle size={32} className="mx-auto mb-2 opacity-30"/>
        <p className="text-sm font-medium">No orders here</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Order</th>
            {showCustomerName && <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>}
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Items</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Delivery</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map(o => {
            const total = o.items?.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0) || 0;
            const isNineteen = o.type === 'NINETEEN_L';
            return (
              <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isNineteen ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {isNineteen ? '19L' : 'PET'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">#{o.id.slice(0, 6).toUpperCase()}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Rs. {total.toFixed(0)}</div>
                </td>
                {showCustomerName && (
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800 text-sm">{o.customer?.name}</div>
                    <div className="text-xs text-slate-500">{o.customer?.phone}</div>
                  </td>
                )}
                <td className="px-4 py-3">
                  {o.items?.map((item, idx) => (
                    <div key={idx} className="text-slate-700 font-medium text-sm">
                      {item.quantity}× <span className="text-slate-500">{item.item?.name?.replace(/aquasphere|wadaana/gi, '').trim()}</span>
                    </div>
                  ))}
                </td>
                <td className="px-4 py-3">
                  {o.expectedDelivery ? (
                    <div className="flex items-center gap-1 text-slate-600 text-xs">
                      <Clock size={12}/>{new Date(o.expectedDelivery).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                    </div>
                  ) : <span className="text-slate-300 text-xs">—</span>}
                  {o.remarks && <div className="text-xs text-slate-400 truncate max-w-[120px] mt-0.5">{o.remarks}</div>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded w-fit ${deliveryBadge(o.deliveryStatus)}`}>{o.deliveryStatus}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded w-fit ${paymentBadge(o.paymentStatus)}`}>{o.paymentStatus}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {o.deliveryStatus !== 'DELIVERED' && o.deliveryStatus !== 'CANCELLED' && (
                    <button onClick={() => onProcess(o)}
                      className="bg-slate-900 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ml-auto">
                      <Truck size={12}/> Process
                    </button>
                  )}
                  {o.deliveryStatus === 'DELIVERED' && (
                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 justify-end">
                      <CheckCircle size={12}/> Done
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
