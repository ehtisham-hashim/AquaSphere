import { X, Printer, ShieldCheck, MapPin, Truck, FileText } from 'lucide-react';

export default function ViewPurchaseModal({ purchase, onClose, onPrint }) {
  if (!purchase) return null;

  const handlePrint = () => {
    if (onPrint) {
      onPrint(purchase);
    } else {
      window.print();
    }
  };

  const renderFulfillmentBadge = (st) => {
    switch (st) {
      case 'RECEIVED':
        return <span className="badge-success">Received</span>;
      case 'PARTIALLY_RECEIVED':
        return <span className="badge-brand">Partial</span>;
      case 'PENDING':
        return <span className="badge-warning">Pending</span>;
      case 'CANCELLED':
        return <span className="badge-danger">Cancelled</span>;
      default:
        return <span className="badge-neutral">{st || 'Received'}</span>;
    }
  };

  const renderPaymentBadge = (pst) => {
    if (pst === 'PAID') {
      return <span className="badge-success">Paid in Cash</span>;
    }
    return <span className="badge-danger">Credit / Khata</span>;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-100 print:shadow-none print:border-none print:w-full print:max-w-none">
        {/* Header */}
        <div className="bg-slate-50/60 border-b border-slate-100 px-6 py-4 flex justify-between items-center shrink-0 print:bg-white print:border-b-2 print:border-slate-800">
          <div>
            <h3 className="text-lg font-black text-slate-800">
              Purchase Invoice: {purchase.invoiceNo || `#${purchase.id?.slice(0, 8)}`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Logged on {new Date(purchase.purchaseDate || purchase.createdAt).toLocaleDateString('en-GB')}
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
            >
              <Printer size={14} /> Print Voucher
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Top Meta Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/70 print:bg-transparent print:border print:border-slate-300">
            <div>
              <span className="text-[11px] text-slate-400 block font-bold uppercase">Vendor</span>
              <span className="font-extrabold text-slate-800 text-sm">{purchase.vendor?.name || '—'}</span>
              {purchase.vendor?.phone && <span className="text-[10px] text-slate-500 block">{purchase.vendor.phone}</span>}
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-bold uppercase">Date</span>
              <span className="font-bold text-slate-800 text-sm">
                {new Date(purchase.purchaseDate || purchase.createdAt).toLocaleDateString('en-GB')}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-bold uppercase mb-1">Stock Status</span>
              {renderFulfillmentBadge(purchase.status)}
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-bold uppercase mb-1">Payment</span>
              {renderPaymentBadge(purchase.paymentStatus)}
            </div>
          </div>

          {/* Delivery & Plant Location Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-100/60">
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-indigo-600 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-700 block">Delivered Location</span>
                <span className="font-bold text-indigo-950">
                  {purchase.deliveredTo === 'WAREHOUSE' ? 'Warehouse Stock' : 'Factory Floor'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Truck size={15} className="text-indigo-600 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-700 block">Audit & Receiver</span>
                <span className="font-bold text-indigo-950">
                  {purchase.createdBy || 'Staff'}
                </span>
              </div>
            </div>
          </div>

          {/* Audit Verification Card */}
          {purchase.verifiedBy && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span>Verified by {purchase.verifiedBy}</span>
              </div>
              {purchase.verifiedAt && (
                <span className="text-emerald-700 font-mono text-[11px]">
                  {new Date(purchase.verifiedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          )}

          {/* Items Table */}
          <div>
            <h4 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">Purchase Line Items</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-bold text-slate-700">
                  <tr>
                    <th className="p-3">Raw Material</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">Unit Rate (PKR)</th>
                    <th className="p-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {purchase.items?.map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td className="p-3 font-semibold text-slate-800">{it.item?.name || 'Material'}</td>
                      <td className="p-3 text-right text-slate-700 font-mono font-bold">
                        {Number(it.quantity)} {it.item?.unit || ''}
                      </td>
                      <td className="p-3 text-right text-slate-600 font-mono">
                        Rs {Number(it.unitPrice).toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-black text-slate-900 font-mono">
                        Rs {Number(it.total || (it.quantity * it.unitPrice)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Remarks */}
          {purchase.remarks && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Remarks / Notes</span>
              <p className="text-slate-700 font-medium">{purchase.remarks}</p>
            </div>
          )}

          {/* Receipt Image if available */}
          {purchase.receiptUrl && (
            <div className="print:hidden">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Supplier Bill / Receipt Photo</span>
              <a
                href={purchase.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all font-semibold text-slate-700"
              >
                <FileText size={16} className="text-[var(--brand)]" />
                <span>Open Attached Bill Photo</span>
              </a>
            </div>
          )}

          {/* Grand Total */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <span className="font-bold text-slate-700 text-sm">Total Procurement Value</span>
            <span className="text-2xl font-bold font-mono text-[var(--brand)]">
              Rs {Number(purchase.grandTotal).toLocaleString('en-PK')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
