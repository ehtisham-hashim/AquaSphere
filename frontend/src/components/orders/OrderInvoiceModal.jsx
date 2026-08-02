import { X, Printer } from 'lucide-react';

export default function OrderInvoiceModal({ order, onClose }) {
  if (!order) return null;

  const orderDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const items = order.items || [];
  const grandTotal = items.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 0), 0);
  const totalPaid = (order.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const balanceDue = grandTotal - totalPaid;

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Printer size={18} className="text-indigo-600" /> Order Invoice
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Printable Area */}
        <div id="order-invoice-print" className="p-6 overflow-y-auto flex-1 space-y-5 text-sm">

          {/* Company Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-4">
            <h2 className="text-lg font-extrabold text-slate-900 uppercase tracking-wide">AquaSphere OS</h2>
            <p className="text-xs text-slate-500 mt-0.5">Order Invoice</p>
          </div>

          {/* Order Meta */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <span className="text-slate-500 font-semibold block">Order ID</span>
              <span className="font-mono font-bold text-slate-800">#{order.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">Date</span>
              <span className="font-semibold text-slate-800">{orderDate}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">Customer</span>
              <span className="font-bold text-slate-900">{order.customer?.name || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">Phone</span>
              <span className="font-semibold text-slate-800">{order.customer?.phone || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">Delivery Status</span>
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                order.deliveryStatus === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' :
                order.deliveryStatus === 'PENDING'   ? 'bg-amber-100 text-amber-700' :
                order.deliveryStatus === 'PARTIAL'   ? 'bg-blue-100 text-blue-700' :
                                                       'bg-red-100 text-red-700'
              }`}>
                {order.deliveryStatus}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">Payment Status</span>
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                order.paymentStatus === 'PAID'    ? 'bg-emerald-100 text-emerald-700' :
                order.paymentStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-red-100 text-red-700'
              }`}>
                {order.paymentStatus}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Item</th>
                  <th className="px-3 py-2.5 text-right">Qty</th>
                  <th className="px-3 py-2.5 text-right">Unit Price</th>
                  <th className="px-3 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-3 py-4 text-center text-slate-400 italic">No items on this order.</td>
                  </tr>
                ) : items.map((item, idx) => {
                  const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2.5 font-semibold text-slate-800">
                        {item.item?.name || item.name || `Item ${idx + 1}`}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-700">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">Rs {Number(item.price || 0).toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-900">Rs {lineTotal.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600 font-semibold">
              <span>Grand Total</span>
              <span className="font-bold text-slate-900">Rs {grandTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Amount Paid</span>
              <span className="font-bold">Rs {totalPaid.toLocaleString()}</span>
            </div>
            <div className={`flex justify-between font-black text-sm pt-1.5 border-t border-slate-200 ${balanceDue > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
              <span>Balance Due</span>
              <span>Rs {balanceDue.toLocaleString()}</span>
            </div>
          </div>

          {/* Remarks */}
          {order.remarks && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
              <span className="font-bold text-slate-700 block mb-0.5">Remarks</span>
              {order.remarks}
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-[10px] text-slate-400 border-t border-dashed border-slate-200 pt-3">
            Thank you for your business!
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-md flex items-center gap-2 transition-colors"
          >
            <Printer size={16} /> Print Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
