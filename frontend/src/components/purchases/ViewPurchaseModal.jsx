import { X, Printer, ShieldCheck } from 'lucide-react';

export default function ViewPurchaseModal({ purchase, onClose, onPrint }) {
  if (!purchase) return null;

  const renderFulfillmentBadge = (st) => {
    switch (st) {
      case 'RECEIVED':
        return <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold">🟢 Received</span>;
      case 'PARTIALLY_RECEIVED':
        return <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-200 text-xs px-2.5 py-0.5 rounded-full font-bold">🔵 Partially Received</span>;
      case 'PENDING':
        return <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-0.5 rounded-full font-bold">🟡 Pending</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs px-2.5 py-0.5 rounded-full font-bold">🔴 Cancelled</span>;
      default:
        return <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 text-xs px-2.5 py-0.5 rounded-full font-bold">{st || 'RECEIVED'}</span>;
    }
  };

  const renderPaymentBadge = (pst) => {
    switch (pst) {
      case 'PAID':
        return <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold">🟢 Paid</span>;
      case 'PARTIAL':
        return <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-200 text-xs px-2.5 py-0.5 rounded-full font-bold">🔵 Partial</span>;
      case 'CREDIT':
      case 'UNPAID':
        return <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs px-2.5 py-0.5 rounded-full font-bold">🔴 Credit</span>;
      default:
        return <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 text-xs px-2.5 py-0.5 rounded-full font-bold">{pst || 'PAID'}</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-lg font-black text-slate-800">
              Purchase: {purchase.invoiceNo || purchase.id}
            </h3>
            <p className="text-xs text-slate-500">
              Logged on {new Date(purchase.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onPrint && (
              <button
                onClick={() => onPrint(purchase)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
              >
                <Printer size={14} /> Print
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Vendor</span>
              <span className="font-bold text-slate-800">{purchase.vendor?.name || '—'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Date</span>
              <span className="font-bold text-slate-800">
                {new Date(purchase.purchaseDate).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium mb-0.5">Shipment</span>
              {renderFulfillmentBadge(purchase.status)}
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium mb-0.5">Payment</span>
              {renderPaymentBadge(purchase.paymentStatus)}
            </div>
          </div>

          {/* Audit Verification Card */}
          {purchase.isVerified && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span>Verified by {purchase.verifiedBy || 'Admin'}</span>
              </div>
              {purchase.verifiedAt && (
                <span className="text-emerald-700 font-medium">{new Date(purchase.verifiedAt).toLocaleDateString()}</span>
              )}
            </div>
          )}

          {/* Items Table */}
          <div>
            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Items Purchased</h4>
            <table className="w-full text-left border border-slate-200 rounded-xl overflow-hidden text-sm">
              <thead className="bg-slate-100 text-xs font-bold text-slate-700">
                <tr>
                  <th className="p-3">Item</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Unit Price</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchase.items?.map((it, idx) => (
                  <tr key={it.id || idx}>
                    <td className="p-3 font-semibold text-slate-800">{it.item?.name || 'Material'}</td>
                    <td className="p-3 text-slate-600 font-bold">{Number(it.quantity)} {it.item?.unit || ''}</td>
                    <td className="p-3 text-slate-600">Rs {Number(it.unitPrice).toLocaleString()}</td>
                    <td className="p-3 text-right font-black text-slate-900">Rs {Number(it.total || (it.quantity * it.unitPrice)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Receipt Image if available */}
          {purchase.receiptUrl && (
            <div>
              <p className="text-xs font-bold uppercase text-slate-500 mb-1.5">Uploaded Bill / Receipt Photo</p>
              <a
                href={purchase.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block p-1 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden hover:opacity-90 transition-all"
              >
                <img src={purchase.receiptUrl} alt="Receipt" className="h-28 w-auto rounded-lg object-cover" />
              </a>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <span className="font-bold text-slate-700">Total Purchase Amount</span>
            <span className="text-2xl font-black text-indigo-600">
              Rs {Number(purchase.grandTotal).toLocaleString('en-PK')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
