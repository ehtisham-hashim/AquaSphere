import { useState } from 'react';
import { X, Printer, Copy, Check, Image as ImageIcon, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '../../context/TenantContext';
import {
  copyTextToClipboard,
  formatOrderInvoiceWhatsApp,
  printReceiptElement,
  copyReceiptElementAsImage
} from '../../utils/receiptFormatter';
import { openWhatsAppWeb, WhatsAppTemplates } from '../../utils/whatsapp';

export default function OrderInvoiceModal({ order, onClose }) {
  const { isWadaana } = useTenant();
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [withGst, setWithGst] = useState(false);

  if (!order) return null;

  const orderId = order.id ? order.id.substring(0, 8).toUpperCase() : 'Invoice';

  const orderDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const items = order.items || [];
  const grandTotal = items.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 0), 0);
  const gstAmount = withGst ? Math.round(grandTotal * 0.18) : 0;
  const netTotal = grandTotal + gstAmount;

  const totalPaid = (order.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const balanceDue = netTotal - totalPaid;

  const handlePrint = () => {
    printReceiptElement('order-invoice-print');
  };

  const getInvoiceData = () => ({
    title: isWadaana ? 'WADAANA WATER & BEVERAGES' : 'AQUASPHERE PURE WATER',
    subtitle: withGst ? 'Commercial Sales Invoice (Tax Invoice)' : 'Commercial Sales Invoice',
    tagline: 'Pure Quality • Safe & Healthy Water',
    withGst,
    strn: 'E208741-4',
    contactInfo: '051-5454438 / 0300-9149143',
    receiptNo: `#${orderId}`,
    receiptNoLabel: 'INV:',
    dateStr: orderDate,
    customerName: order.customer?.name || 'Walk-In Customer',
    customerPhone: order.customer?.phone || '',
    paymentMethod: order.paymentStatus || 'UNPAID',
    statusValue: balanceDue > 0 ? `DUE: ₨ ${balanceDue.toLocaleString()}` : 'PAID IN FULL',
    servedBy: `DELIVERY: ${order.deliveryStatus || 'PENDING'}`,
    items: items.map(item => {
      const qty = Number(item.quantity || 0);
      const rate = Number(item.price || 0);
      return {
        name: item.item?.name || 'Item',
        qty,
        unitPrice: rate,
        lineTotal: qty * rate
      };
    }),
    summaryRows: [
      { label: 'Subtotal', value: grandTotal },
      ...(withGst ? [{ label: 'GST (18%)', value: gstAmount }] : []),
      { label: 'Amount Paid', value: totalPaid },
      ...(balanceDue > 0 ? [{ label: 'Balance Due', value: balanceDue }] : [])
    ],
    netTotal: netTotal,
    remarks: order.remarks || '',
    footerNote: 'THANK YOU FOR CHOOSING AQUASPHERE!'
  });

  const handleCopyImage = async () => {
    try {
      const invoiceData = getInvoiceData();
      const res = await copyReceiptElementAsImage('order-invoice-print', invoiceData);
      if (res && res.method === 'clipboard') {
        setCopiedImage(true);
        toast.success('Invoice image copied! Paste (Ctrl+V) directly into WhatsApp.');
        setTimeout(() => setCopiedImage(false), 2500);
      } else {
        toast.info('Invoice image downloaded! You can attach it directly in WhatsApp.');
      }
      return res;
    } catch (err) {
      console.error('Invoice image copy failed:', err);
      toast.error('Could not copy image. Try Print Invoice or Copy Text.');
      return null;
    }
  };

  const handleCopyText = async () => {
    try {
      const text = formatOrderInvoiceWhatsApp(order, items, grandTotal, totalPaid, balanceDue, isWadaana, withGst);
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

  const handleSendWhatsAppCustomer = async () => {
    // 1. Copy image to clipboard for instant pasting
    await handleCopyImage();

    // 2. Build summary message text
    const summaryText = WhatsAppTemplates.invoiceSummary(order, netTotal, balanceDue, isWadaana);

    // 3. Open WhatsApp Web directly with prefilled text
    openWhatsAppWeb(order.customer?.phone, summaryText);
    toast.success('Opening WhatsApp! Paste the invoice image (Ctrl+V) into the chat.');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Printer size={16} className="text-slate-800" /> Order Invoice
            </h3>
            {/* Dual GST Toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setWithGst(false)}
                className={`px-2 py-1 rounded-md transition-all ${
                  !withGst ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Customer Care
              </button>
              <button
                type="button"
                onClick={() => setWithGst(true)}
                className={`px-2 py-1 rounded-md transition-all ${
                  withGst ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                With 18% GST & STRN
              </button>
            </div>
          </div>
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
              {withGst ? 'Commercial Sales Invoice (Tax Invoice)' : 'Commercial Sales Invoice'}
            </p>
            {withGst ? (
              <div className="text-[11px] font-bold text-black mt-1 space-y-0.5">
                <p>STRN #: E208741-4</p>
                <p className="text-slate-700 font-normal">Tel: 051-5454438 | Cell: 0300-9149143</p>
              </div>
            ) : (
              <p className="text-[11px] font-bold text-emerald-700 mt-1">Customer Care</p>
            )}
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
            {withGst && (
              <div className="flex justify-between">
                <span>GST (18%):</span>
                <span className="font-bold">₨ {gstAmount.toLocaleString()}</span>
              </div>
            )}
            {withGst && (
              <div className="flex justify-between font-bold">
                <span>Net Total:</span>
                <span>₨ {netTotal.toLocaleString()}</span>
              </div>
            )}
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
            className="btn-secondary text-xs py-2 px-3"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleCopyText}
            className={`btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 transition-colors ${
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
            className={`btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 transition-colors ${
              copiedImage ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'text-slate-700 hover:text-slate-900'
            }`}
            title="Copy invoice as PNG image for WhatsApp"
          >
            {copiedImage ? <Check size={14} className="text-emerald-600" /> : <ImageIcon size={14} />}
            {copiedImage ? 'Image Copied!' : 'Copy Image'}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <Printer size={14} /> Print
          </button>
          <button
            type="button"
            onClick={handleSendWhatsAppCustomer}
            className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-xs"
            title="Copy invoice image to clipboard & open WhatsApp with customer"
          >
            <Send size={14} /> Send Invoice (WhatsApp)
          </button>
        </div>
      </div>
    </div>
  );
}
