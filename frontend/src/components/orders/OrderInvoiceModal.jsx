import { useState } from 'react';
import { X, Printer, Copy, Check, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '../../context/TenantContext';
import {
  copyTextToClipboard,
  formatOrderInvoiceWhatsApp,
  printReceiptElement,
  renderReceiptToCanvas,
  copyCanvasImageToClipboard
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
      const company = isWadaana ? 'WADAANA WATER & BEVERAGES' : 'AQUASPHERE PURE WATER';
      const canvas = renderReceiptToCanvas({
        title: company,
        subtitle: 'Commercial Sales Invoice',
        receiptNoLabel: 'INVOICE NO',
        receiptNo: `#${orderId}`,
        dateStr: orderDate,
        customerName: order.customer?.name || 'Walk-In Customer',
        paymentMethod: order.customer?.phone || 'Cash / Delivery',
        servedBy: order.deliveryStatus || 'Commercial',
        statusValue: balanceDue > 0 ? `DUE (Rs. ${balanceDue.toLocaleString()})` : 'PAID IN FULL',
        items: items.map(item => ({
          name: item.item?.name || 'Item',
          qty: Number(item.quantity || 0),
          unitPrice: Number(item.price || 0),
          lineTotal: Number(item.price || 0) * Number(item.quantity || 0)
        })),
        summaryRows: [
          { label: 'SUBTOTAL', value: grandTotal },
          { label: 'AMOUNT PAID', value: totalPaid },
          ...(balanceDue > 0 ? [{ label: 'BALANCE DUE', value: balanceDue }] : [])
        ],
        netTotal: grandTotal,
        remarks: order.remarks,
        footerNote: `THANK YOU FOR CHOOSING ${isWadaana ? 'WADAANA' : 'AQUASPHERE'}!`
      });

      await copyCanvasImageToClipboard(canvas);
      setCopiedImage(true);
      toast.success('Invoice image copied! Paste (Ctrl+V) directly into WhatsApp.');
      setTimeout(() => setCopiedImage(false), 2500);
    } catch (err) {
      console.warn('Canvas image copy failed, falling back to text:', err);
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
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Printer size={16} className="text-slate-800" /> Order Invoice
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Printable Area - Classic POS with Dashed Lines & Edge Expansion */}
        <div id="order-invoice-print" className="p-8 overflow-y-auto flex-1 font-mono text-xs bg-white text-black leading-relaxed">

          {/* Company Header */}
          <div className="text-center pb-2">
            <h2 className="text-xl font-bold uppercase tracking-wider text-black">
              {isWadaana ? 'WADAANA WATER & BEVERAGES' : 'AQUASPHERE PURE WATER'}
            </h2>
            <p className="text-xs font-semibold text-black uppercase tracking-widest mt-0.5">
              Commercial Sales Invoice
            </p>
            <p className="text-[11px] text-slate-600 mt-0.5">Pure Quality • Safe & Healthy Drinking Water</p>
            <div className="border-b border-dashed border-black mt-3"></div>
          </div>

          {/* Order Meta Grid */}
          <div className="space-y-1.5 py-2">
            <div className="flex justify-between">
              <span><strong>INVOICE NO:</strong> #{orderId}</span>
              <span><strong>DATE:</strong> {orderDate}</span>
            </div>
            <div className="flex justify-between">
              <span><strong>CUSTOMER:</strong> {order.customer?.name || 'Walk-In Customer'}</span>
              <span><strong>PHONE:</strong> {order.customer?.phone || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span><strong>DELIVERY:</strong> {order.deliveryStatus || 'PENDING'}</span>
              <span><strong>STATUS:</strong> {balanceDue > 0 ? `DUE (₨ ${balanceDue.toLocaleString()})` : 'PAID IN FULL'}</span>
            </div>
          </div>

          {/* Items Table with Dashed Lines */}
          <div className="border-t border-dashed border-black mt-2 pt-2">
            <div className="grid grid-cols-12 font-bold uppercase pb-1.5 text-[11px]">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Item Description</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Rate</div>
              <div className="col-span-2 text-right">Amount</div>
            </div>
            <div className="border-b border-dashed border-black"></div>

            {/* Table Rows */}
            <div className="py-2 space-y-1.5">
              {items.length === 0 ? (
                <div className="py-3 text-center text-slate-500 italic">No items recorded</div>
              ) : (
                items.map((item, idx) => {
                  const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);
                  return (
                    <div key={idx} className="grid grid-cols-12 items-center">
                      <div className="col-span-1 text-slate-600">{idx + 1}</div>
                      <div className="col-span-5 font-bold">{item.item?.name || 'Item'}</div>
                      <div className="col-span-2 text-center font-bold">{item.quantity}</div>
                      <div className="col-span-2 text-right">
                        ₨ {Number(item.price || 0).toLocaleString()}
                      </div>
                      <div className="col-span-2 text-right font-bold">
                        ₨ {lineTotal.toLocaleString()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="border-b border-dashed border-black"></div>
          </div>

          {/* Financial Summary */}
          <div className="flex justify-end pt-3">
            <div className="w-72 space-y-1 text-xs">
              <div className="flex justify-between py-0.5">
                <span>Subtotal:</span>
                <span className="font-bold">₨ {grandTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Amount Paid:</span>
                <span className="font-bold">₨ {totalPaid.toLocaleString()}</span>
              </div>
              <div className="border-t-2 border-b-2 border-double border-black py-1.5 my-1 flex justify-between font-black text-sm">
                <span>BALANCE DUE:</span>
                <span>₨ {balanceDue.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {order.remarks && (
            <div className="border border-dashed border-black p-2 text-xs text-black mt-3">
              <span className="font-bold uppercase tracking-wider text-[10px] block">Remarks:</span>
              <span>{order.remarks}</span>
            </div>
          )}

          {/* Signature Lines */}
          <div className="grid grid-cols-2 gap-8 pt-8 pb-2 mt-4 text-xs">
            <div>
              <div className="border-b border-dashed border-black w-40 mb-1"></div>
              <span className="text-[10px] font-bold uppercase tracking-wider">Received By / Customer</span>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="border-b border-dashed border-black w-40 mb-1"></div>
              <span className="text-[10px] font-bold uppercase tracking-wider">Authorized Stamp / Sign</span>
            </div>
          </div>

          {/* Bottom Invoice Notice */}
          <div className="text-center pt-3 border-t border-dashed border-black text-[10px] text-slate-600 mt-4">
            THANK YOU FOR CHOOSING {isWadaana ? 'WADAANA' : 'AQUASPHERE'}! • COMPUTER GENERATED POS INVOICE
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
