import { useState } from 'react';
import { X, Printer, Copy, Check, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '../../context/TenantContext';
import {
  copyTextToClipboard,
  formatOrderInvoiceWhatsApp,
  printReceiptElement,
  copyReceiptElementAsImage
} from '../../utils/receiptFormatter';

export default function OrderInvoiceModal({ order, onClose }) {
  const { isWadaana } = useTenant();
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  if (!order) return null;

  const orderId = order.id ? order.id.substring(0, 8).toUpperCase() : 'Invoice';

  const orderDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const items = order.items || [];
  const grandTotal = items.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 0), 0);
  const totalPaid = (order.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const balanceDue = grandTotal - totalPaid;

  const handlePrint = () => {
    printReceiptElement('order-invoice-print');
  };

  const handleCopyImage = async () => {
    try {
      await copyReceiptElementAsImage('order-invoice-print');
      setCopiedImage(true);
      toast.success('Invoice image copied! Paste (Ctrl+V) directly into WhatsApp.');
      setTimeout(() => setCopiedImage(false), 2500);
    } catch (err) {
      console.warn('Invoice image copy failed, falling back to text:', err);
      handleCopyText();
    }
  };

  const handleCopyText = async () => {
    try {
      const text = formatOrderInvoiceWhatsApp(order, items, grandTotal, totalPaid, balanceDue, isWadaana);
      const ok = await copyTextToClipboard(text);
      if (ok) {
        setCopiedText(true);
        toast.success('Invoice text copied! Paste into WhatsApp.');
        setTimeout(() => setCopiedText(false), 2500);
      } else {
        toast.error('Failed to copy to clipboard.');
      }
    } catch (err) {
      console.error('Copy failed:', err);
      toast.error('Failed to copy to clipboard.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-100 shrink-0">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Printer size={16} className="text-slate-800" /> Order Invoice
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Printable Area - Professional Times New Roman Layout */}
        <div 
          id="order-invoice-print" 
          className="p-5 overflow-y-auto flex-1 bg-white text-black leading-normal selection:bg-slate-200"
          style={{ fontFamily: '"Times New Roman", Times, "Tinos", serif' }}
        >

          {/* Company Header */}
          <div className="text-center pb-2">
            <h2 className="text-lg font-bold uppercase tracking-wider text-black">
              {isWadaana ? 'WADAANA WATER & BEVERAGES' : 'AQUASPHERE PURE WATER'}
            </h2>
            <p className="text-xs font-bold text-black uppercase tracking-widest mt-1">
              Commercial Sales Invoice
            </p>
            <p className="text-[11px] italic text-slate-700 mt-0.5">Pure Quality • Safe & Healthy Water</p>
            <div className="border-b border-dashed border-black/80 my-2.5"></div>
          </div>

          {/* Order Meta Grid */}
          <div className="text-xs space-y-1.5 py-1 border-b border-dashed border-black/80">
            <div className="flex justify-between items-center">
              <span><strong>INV:</strong> #{orderId}</span>
              <span className="text-slate-800">{orderDate}</span>
            </div>
            <div><strong>CUST:</strong> {order.customer?.name || 'Walk-In Customer'}</div>
            <div className="flex justify-between items-center">
              <span><strong>PHONE:</strong> {order.customer?.phone || '—'}</span>
              <span className="font-bold">{balanceDue > 0 ? `DUE: ₨ ${balanceDue.toLocaleString()}` : 'PAID IN FULL'}</span>
            </div>
            <div className="text-slate-700 text-[11px]">DELIVERY: {order.deliveryStatus || 'PENDING'}</div>
          </div>

          {/* Items Table */}
          <div className="mt-2.5">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-dashed border-black font-bold uppercase text-[11px]">
                  <th className="py-1.5 text-left w-5">#</th>
                  <th className="py-1.5 text-left">Item</th>
                  <th className="py-1.5 text-center w-10">Qty</th>
                  <th className="py-1.5 text-right w-14">Rate</th>
                  <th className="py-1.5 text-right w-16">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-slate-300">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-3 text-center text-slate-500 italic">No items recorded</td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);
                    return (
                      <tr key={idx}>
                        <td className="py-1.5 text-slate-600 text-[11px] align-top">{idx + 1}</td>
                        <td className="py-1.5 font-bold pr-1.5 leading-snug align-top">{item.item?.name || 'Item'}</td>
                        <td className="py-1.5 text-center font-bold align-top">{item.quantity}</td>
                        <td className="py-1.5 text-right text-slate-800 align-top">
                          {Number(item.price || 0).toLocaleString()}
                        </td>
                        <td className="py-1.5 text-right font-bold align-top">
                          {lineTotal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <div className="border-b border-dashed border-black/80 mt-2"></div>
          </div>

          {/* Financial Summary */}
          <div className="pt-2.5 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-bold">₨ {grandTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount Paid:</span>
              <span className="font-bold">₨ {totalPaid.toLocaleString()}</span>
            </div>
            <div className="border-t-2 border-b-2 border-double border-black py-2 my-2 flex justify-between font-bold text-sm">
              <span>BALANCE DUE:</span>
              <span>₨ {balanceDue.toLocaleString()}</span>
            </div>
          </div>

          {order.remarks && (
            <div className="border border-dashed border-black/80 p-2 text-xs text-black mt-2.5 rounded-sm">
              <span className="font-bold uppercase tracking-wider text-[10px] block text-slate-700">Remarks:</span>
              <span>{order.remarks}</span>
            </div>
          )}

          {/* Bottom Invoice Notice */}
          <div className="text-center pt-3 border-t border-dashed border-black/80 text-[11px] italic text-slate-700 mt-3">
            THANK YOU FOR CHOOSING {isWadaana ? 'WADAANA' : 'AQUASPHERE'}!
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-4"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleCopyText}
            className={`btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 transition-colors ${
              copiedText ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'text-slate-700 hover:text-slate-900'
            }`}
            title="Copy invoice text for WhatsApp / SMS"
          >
            {copiedText ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            {copiedText ? 'Text Copied!' : 'Copy Text'}
          </button>
          <button
            type="button"
            onClick={handleCopyImage}
            className={`btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 transition-colors ${
              copiedImage ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'text-slate-700 hover:text-slate-900'
            }`}
            title="Copy invoice as PNG image for WhatsApp"
          >
            {copiedImage ? <Check size={14} className="text-emerald-600" /> : <ImageIcon size={14} />}
            {copiedImage ? 'Image Copied!' : 'Copy Image (WhatsApp)'}
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
