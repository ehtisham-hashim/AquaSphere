import { useState } from 'react';
import { X, Printer, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '../../context/TenantContext';
import { copyTextToClipboard, formatOrderInvoiceWhatsApp } from '../../utils/receiptFormatter';

export default function OrderInvoiceModal({ order, onClose }) {
  const { isWadaana } = useTenant();
  const [copied, setCopied] = useState(false);

  if (!order) return null;

  const orderId = order.id ? order.id.substring(0, 8).toUpperCase() : 'Invoice';

  const handlePrint = () => {
    window.print();
  };

  const handleCopyWhatsApp = async () => {
    try {
      const text = formatOrderInvoiceWhatsApp(order, items, grandTotal, totalPaid, balanceDue, isWadaana);
      const ok = await copyTextToClipboard(text);
      if (ok) {
        setCopied(true);
        toast.success('Invoice copied! Paste (Ctrl+V) directly into WhatsApp.');
        setTimeout(() => setCopied(false), 2500);
      } else {
        toast.error('Failed to copy to clipboard.');
      }
    } catch (err) {
      console.error('Copy failed:', err);
      toast.error('Failed to copy to clipboard.');
    }
  };

  const orderDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const items = order.items || [];
  const grandTotal = items.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 0), 0);
  const totalPaid = (order.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const balanceDue = grandTotal - totalPaid;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:p-0 print:bg-white print:fixed">
      {/* Isolated Print Stylesheet */}
      <style>{`
        @page {
          size: A5 portrait;
          margin: 8mm 10mm;
        }
        @media print {
          html, body {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #order-invoice-print, #order-invoice-print * {
            visibility: visible;
          }
          #order-invoice-print {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            color: #0f172a !important;
            font-size: 13px !important;
            line-height: 1.5 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] print:border-none print:shadow-none print:p-0 print:max-w-none print:max-h-none">

        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0 no-print">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Printer size={16} className="text-brand-primary" /> Order Invoice
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Printable Area */}
        <div id="order-invoice-print" className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">

          {/* Company Header */}
          <div className="text-center border-b border-dashed border-slate-200 pb-3">
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
              {isWadaana ? 'Wadaana Water & Beverages' : 'AquaSphere Pure Water'}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Sales Invoice</p>
          </div>

          {/* Order Meta */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Order ID</span>
              <span className="font-mono font-bold text-slate-800">#{orderId}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Date</span>
              <span className="font-semibold text-slate-800">{orderDate}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Customer</span>
              <span className="font-bold text-slate-900">{order.customer?.name || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Phone</span>
              <span className="font-mono font-semibold text-slate-800">{order.customer?.phone || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Delivery Status</span>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-slate-50 text-slate-700 border-slate-200">
                {order.deliveryStatus || 'PENDING'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Payment Status</span>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-slate-50 text-slate-700 border-slate-200">
                {order.paymentStatus || 'UNPAID'}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="py-2 px-3">Item</th>
                  <th className="py-2 px-3 text-center">Qty</th>
                  <th className="py-2 px-3 text-right">Rate</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-slate-400 italic text-xs">No items</td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-medium text-slate-800">{item.item?.name || 'Item'}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold">{item.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">₨ {Number(item.price || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">₨ {lineTotal.toLocaleString()}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between font-mono">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-bold text-slate-800">₨ {grandTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-600">Amount Paid:</span>
              <span className="font-bold text-emerald-700">₨ {totalPaid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-mono font-bold text-sm border-t border-slate-200 pt-1.5">
              <span className="text-slate-900">Balance Due:</span>
              <span className={balanceDue > 0 ? 'text-rose-600' : 'text-slate-800'}>
                ₨ {balanceDue.toLocaleString()}
              </span>
            </div>
          </div>

          {order.remarks && (
            <div className="border-t border-dashed border-slate-200 pt-2 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">Remarks: </span>{order.remarks}
            </div>
          )}

          {/* Signature Lines */}
          <div className="grid grid-cols-2 gap-8 pt-8 pb-2 border-t border-slate-200 mt-4 text-xs text-slate-600">
            <div>
              <div className="border-b border-slate-300 w-36 mb-1"></div>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Received By / Customer</span>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="border-b border-slate-300 w-36 mb-1"></div>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Authorized Stamp / Sign</span>
            </div>
          </div>

          {/* Bottom Invoice Notice */}
          <div className="text-center pt-2 border-t border-dashed border-slate-200 text-[10px] text-slate-400">
            Thank you for choosing {isWadaana ? 'Wadaana' : 'AquaSphere'}! • Computer generated invoice.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 shrink-0 no-print flex-wrap">
          <button
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-4"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleCopyWhatsApp}
            className={`btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 transition-colors ${
              copied ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'text-slate-700 hover:text-slate-900'
            }`}
            title="Copy invoice for WhatsApp"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy for WhatsApp'}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
          >
            <Printer size={14} /> Print Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
