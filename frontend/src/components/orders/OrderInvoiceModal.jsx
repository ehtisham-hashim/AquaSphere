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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print-modal-container print:p-0 print:bg-white print:fixed">
      {/* Isolated Print Stylesheet */}
      <style>{`
        @page {
          size: auto;
          margin: 12mm 15mm;
        }
        @media print {
          html, body {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          .print-modal-container {
            position: static !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            background: transparent !important;
          }
          .print-modal-box {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
          }
          #order-invoice-print, #order-invoice-print * {
            visibility: visible !important;
          }
          #order-invoice-print {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 13px !important;
            line-height: 1.5 !important;
          }
          #order-invoice-print * {
            color: #000000 !important;
            border-color: #000000 !important;
            background-color: transparent !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] print-modal-box print:border-none print:shadow-none print:p-0 print:max-w-none print:max-h-none">

        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0 no-print">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Printer size={16} className="text-slate-800" /> Order Invoice
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Printable Area */}
        <div id="order-invoice-print" className="p-8 overflow-y-auto flex-1 space-y-4 text-xs bg-white text-black font-sans">

          {/* Company Header */}
          <div className="text-center pb-3 border-b-2 border-black">
            <h2 className="text-2xl font-black text-black uppercase tracking-wider">
              {isWadaana ? 'WADAANA WATER & BEVERAGES' : 'AQUASPHERE PURE WATER'}
            </h2>
            <p className="text-xs font-bold text-black uppercase tracking-widest mt-1">
              Commercial Sales Invoice
            </p>
            <p className="text-[11px] text-slate-600 print:text-black mt-0.5">Pure Quality • Safe & Healthy Drinking Water</p>
          </div>

          {/* Order Meta Grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs py-2 border-b border-black">
            <div>
              <span className="font-bold text-black uppercase text-[10px] tracking-wider block">Invoice No:</span>
              <span className="font-mono font-black text-black text-sm">#{orderId}</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-black uppercase text-[10px] tracking-wider block">Date:</span>
              <span className="font-semibold text-black font-mono">{orderDate}</span>
            </div>
            <div>
              <span className="font-bold text-black uppercase text-[10px] tracking-wider block">Customer:</span>
              <span className="font-bold text-black">{order.customer?.name || 'Walk-In Customer'}</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-black uppercase text-[10px] tracking-wider block">Phone:</span>
              <span className="font-mono font-semibold text-black">{order.customer?.phone || '—'}</span>
            </div>
            <div>
              <span className="font-bold text-black uppercase text-[10px] tracking-wider block">Delivery Status:</span>
              <span className="font-mono font-bold text-black uppercase">[ {order.deliveryStatus || 'PENDING'} ]</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-black uppercase text-[10px] tracking-wider block">Payment Status:</span>
              <span className="font-mono font-bold text-black uppercase">
                {balanceDue > 0 ? `[ DUE: ₨ ${balanceDue.toLocaleString()} ]` : '[ PAID IN FULL ]'}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="mt-3">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-y-2 border-black font-black uppercase text-[11px]">
                  <th className="py-2.5 px-3 w-10">#</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-center w-24">Qty</th>
                  <th className="py-2.5 px-3 text-right w-32">Rate (₨)</th>
                  <th className="py-2.5 px-3 text-right w-32">Amount (₨)</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-500 italic">No items recorded</td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);
                    return (
                      <tr key={idx} className="border-b border-slate-300 print:border-black">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600 print:text-black">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-black">{item.item?.name || 'Item'}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-black">{item.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono text-black">
                          ₨ {Number(item.price || 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-black">
                          ₨ {lineTotal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="flex justify-end pt-3">
            <div className="w-80 space-y-1.5 text-xs border-t border-black pt-2">
              <div className="flex justify-between py-0.5">
                <span className="font-semibold text-black">Subtotal:</span>
                <span className="font-mono font-bold text-black">₨ {grandTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="font-semibold text-black">Amount Paid:</span>
                <span className="font-mono font-bold text-black">₨ {totalPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-b-2 border-black font-black text-sm mt-1">
                <span>BALANCE DUE:</span>
                <span className="font-mono">
                  ₨ {balanceDue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {order.remarks && (
            <div className="border border-black p-2 text-xs text-black mt-2">
              <span className="font-bold uppercase tracking-wider text-[10px] block">Remarks:</span>
              <span>{order.remarks}</span>
            </div>
          )}

          {/* Signature Lines */}
          <div className="grid grid-cols-2 gap-8 pt-10 pb-2 mt-6 text-xs text-black">
            <div>
              <div className="border-b border-black w-44 mb-1"></div>
              <span className="text-[10px] font-bold uppercase tracking-wider">Received By / Customer</span>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="border-b border-black w-44 mb-1"></div>
              <span className="text-[10px] font-bold uppercase tracking-wider">Authorized Stamp / Sign</span>
            </div>
          </div>

          {/* Bottom Invoice Notice */}
          <div className="text-center pt-3 border-t border-black text-[10px] font-medium text-slate-600 print:text-black mt-3">
            Thank you for choosing {isWadaana ? 'Wadaana Water & Beverages' : 'AquaSphere Pure Water'}! • Computer Generated POS Invoice
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
