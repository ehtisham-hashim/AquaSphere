import { useState } from 'react';
import { X, Printer, Eye, Copy, Check, Image as ImageIcon, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '../../context/TenantContext';
import {
  copyTextToClipboard,
  formatCounterSaleWhatsApp,
  printReceiptElement,
  copyReceiptElementAsImage
} from '../../utils/receiptFormatter';
import { openWhatsAppWeb } from '../../utils/whatsapp';

const nameMap = {
  'PACK_05L': '0.5L Full Pack (12 Btls)',
  'SINGLE_05L': '0.5L Single Bottle',
  'PACK_15L': '1.5L Full Pack (6 Btls)',
  'SINGLE_15L': '1.5L Single Bottle',
  'BOTTLE_19L': '19L Bottle Refill',
  'CUSTOM': 'Custom Bulk Water'
};

const priceMap = {
  'PACK_05L': 360,
  'SINGLE_05L': 35,
  'PACK_15L': 300,
  'SINGLE_15L': 60,
  'BOTTLE_19L': 200,
  'CUSTOM': 10
};

export default function CounterSaleReceiptModal({ receiptSale, onClose, user }) {
  const { isWadaana } = useTenant();
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [withGst, setWithGst] = useState(false);

  if (!receiptSale) return null;

  const saleId = receiptSale.saleNumber || receiptSale.id?.substring(0, 8) || 'Receipt';

  // Use normalized items if available, otherwise parse legacy productType string
  let items;
  if (Array.isArray(receiptSale.items) && receiptSale.items.length > 0) {
    items = receiptSale.items.map(line => ({
      name: line.item?.name || 'Item',
      qty: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      lineTotal: Number(line.subtotal)
    }));
  } else {
    const productStr = receiptSale.productType || 'CUSTOM';
    items = (productStr.includes('(') || productStr.includes(','))
      ? productStr.split(',').map(part => {
          const trimmed = part.trim();
          const match = trimmed.match(/^([A-Z0-9_]+)\s*\(x(\d+)\)$/);
          if (match) {
            const code = match[1];
            const qty = parseInt(match[2], 10);
            const name = nameMap[code] || code;
            const unitPrice = priceMap[code] || 0;
            return { name, qty, unitPrice, lineTotal: qty * unitPrice };
          }
          return { name: trimmed, qty: 1, unitPrice: 0, lineTotal: 0 };
        })
      : [{
          name: nameMap[productStr] || productStr,
          qty: Number(receiptSale.productQty || 1),
          unitPrice: priceMap[productStr] || 0,
          lineTotal: Number(receiptSale.productQty || 1) * (priceMap[productStr] || 0)
        }];
  }

  const totalAmount = Number(receiptSale.totalAmount ?? (Number(receiptSale.cashCollected || 0) + Number(receiptSale.creditAmount || 0)));
  const subtotal = totalAmount;
  const gstAmount = withGst ? Math.round(totalAmount * 0.18) : 0;
  const netTotal = withGst ? Math.round(totalAmount * 1.18) : totalAmount;

  const paid = Number(receiptSale.amountPaid ?? (withGst ? netTotal : totalAmount));
  const debt = Number(receiptSale.debtAmount ?? Number(receiptSale.creditAmount || 0));

  const handlePrint = () => {
    printReceiptElement('printable-receipt');
  };

  const getReceiptData = () => ({
    title: withGst ? (isWadaana ? 'WADAANA WATER & BEVERAGES' : 'AQUASPHERE PURE WATER') : 'CUSTOMER CARE',
    subtitle: withGst ? 'Retail Sale • Counter Dispatch (Tax Invoice)' : 'Retail Sale • Counter Dispatch',
    tagline: 'Premium Drinking Water • Reverse Osmosis Treated',
    withGst,
    strn: 'E208741-4',
    contactInfo: 'Tel: 051-5454438 | Cell: 0300-9149143',
    receiptNo: saleId,
    dateStr: new Date(receiptSale.createdAt).toLocaleDateString('en-GB'),
    customerName: receiptSale.customer?.name || 'Walk-In',
    paymentMethod: receiptSale.paymentMethod || 'CASH',
    statusValue: debt > 0 ? `DUE: Rs. ${debt.toLocaleString()}` : 'PAID IN FULL',
    servedBy: `STAFF: ${receiptSale.createdBy?.name || user?.name || 'Staff'} (${receiptSale.createdBy?.role || user?.role || 'POS'})`,
    items: items.map(item => ({
      name: item.name,
      qty: item.qty,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal
    })),
    summaryRows: [
      { label: 'Subtotal', value: totalAmount },
      ...(withGst ? [{ label: 'GST (18%)', value: gstAmount }] : []),
      { label: 'Amount Paid', value: withGst ? netTotal : totalAmount },
      ...(debt > 0 ? [{ label: 'Customer Debt', value: debt }] : [])
    ],
    netTotal: netTotal,
    footerNote: withGst ? (isWadaana ? 'THANK YOU FOR CHOOSING WADAANA' : 'THANK YOU FOR CHOOSING AQUASPHERE') : 'THANK YOU FOR CHOOSING US'
  });

  const handleCopyImage = async () => {
    try {
      const receiptData = getReceiptData();
      const res = await copyReceiptElementAsImage('printable-receipt', receiptData);
      if (res && res.method === 'clipboard') {
        setCopiedImage(true);
        toast.success('Receipt image copied! Paste (Ctrl+V) directly into WhatsApp.');
        setTimeout(() => setCopiedImage(false), 2500);
      } else {
        toast.info('Receipt image downloaded! You can attach it directly in WhatsApp.');
      }
    } catch (err) {
      console.error('Receipt image copy failed:', err);
      toast.error('Could not copy image. Try Print Receipt or Copy Text.');
    }
  };

  const handleCopyText = async () => {
    try {
      const text = formatCounterSaleWhatsApp(receiptSale, items, subtotal, paid, debt, isWadaana, user, withGst);
      const ok = await copyTextToClipboard(text);
      if (ok) {
        setCopiedText(true);
        toast.success('Receipt text copied! Paste into WhatsApp.');
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
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Eye size={18} className="text-slate-800" /> Counter Sale Receipt
            </h3>
            {/* GST Toggle Button */}
            <button
              type="button"
              onClick={() => setWithGst(!withGst)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                withGst
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
              }`}
            >
              {withGst ? '✓ With 18% GST & STRN' : 'Customer Care (No GST)'}
            </button>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18}/>
          </button>
        </div>

        {/* Printable Receipt Body */}
        <div 
          id="printable-receipt" 
          className="p-5 overflow-y-auto flex-1 bg-white text-black leading-normal selection:bg-slate-200"
          style={{ fontFamily: '"Times New Roman", Times, "Tinos", serif' }}
        >
          {/* HEADER */}
          <div className="text-center border-b-2 border-slate-800 pb-3 mb-3">
            <h1 className="text-xl font-black tracking-wide">
              {withGst ? (isWadaana ? 'WADAANA WATER & BEVERAGES' : 'AQUASPHERE PURE WATER') : 'CUSTOMER CARE'}
            </h1>

            <div className="text-xs text-slate-600 mt-1">
              Tel: 051-5454438 | Cell: 0300-9149143
            </div>

            <div className="text-[10px] text-slate-500 italic mt-0.5">
              Premium Drinking Water • Reverse Osmosis Treated
            </div>

            {/* STRN - Only show if withGst is true */}
            {withGst && (
              <div className="text-xs font-bold text-slate-900 mt-1 font-mono">
                STRN #: E208741-4
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-2 text-xs border-b border-slate-200 pb-3 mb-3">
            <div>
              <span className="text-slate-500">REC:</span>{' '}
              <span className="font-mono font-bold">{saleId}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500">DATE:</span>{' '}
              <span className="font-bold">
                {new Date(receiptSale.createdAt).toLocaleDateString('en-GB')}
              </span>
            </div>
            <div>
              <span className="text-slate-500">CUST:</span>{' '}
              <span className="font-bold">{receiptSale.customer?.name || 'Walk-In'}</span>
              {/* Show customer STRN if withGst and customer exists */}
              {withGst && receiptSale.customer?.name && (
                <span className="text-[10px] text-slate-600 block font-mono">
                  STRN: E208741-4
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-slate-500">PAY:</span>{' '}
              <span className="font-bold uppercase">{receiptSale.paymentMethod || 'CASH'}</span>
              <span className="text-[10px] text-emerald-600 block font-semibold">
                PAID IN FULL
              </span>
            </div>
          </div>

          {/* Itemized Table */}
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
                  items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 text-slate-600 text-[11px] align-top">{idx + 1}</td>
                      <td className="py-1.5 font-bold pr-1.5 leading-snug align-top">{item.name}</td>
                      <td className="py-1.5 text-center font-bold align-top">{item.qty}</td>
                      <td className="py-1.5 text-right text-slate-800 align-top">{item.unitPrice > 0 ? item.unitPrice.toLocaleString() : '—'}</td>
                      <td className="py-1.5 text-right font-bold align-top">{item.lineTotal.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="border-b border-dashed border-black/80 mt-2"></div>
          </div>

          {/* TOTALS */}
          <div className="border-t-2 border-slate-800 pt-3 mb-4 space-y-1.5 text-xs">
            {/* Subtotal (Before GST) */}
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-mono font-bold">Rs. {totalAmount.toLocaleString()}</span>
            </div>

            {/* GST Row - Only if withGst is true */}
            {withGst && (
              <div className="flex justify-between text-slate-700">
                <span>GST (18%):</span>
                <span className="font-mono font-bold">
                  Rs. {Math.round(totalAmount * 0.18).toLocaleString()}
                </span>
              </div>
            )}

            {/* Net Total */}
            <div className="flex justify-between text-base font-black border-t border-slate-300 pt-1.5">
              <span>Net Total:</span>
              <span className="font-mono">
                Rs. {withGst 
                  ? Math.round(totalAmount * 1.18).toLocaleString() 
                  : totalAmount.toLocaleString()}
              </span>
            </div>

            {/* Amount Paid */}
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Amount Paid:</span>
              <span className="font-mono">
                Rs. {withGst 
                  ? Math.round(totalAmount * 1.18).toLocaleString() 
                  : totalAmount.toLocaleString()}
              </span>
            </div>
            {debt > 0 && (
              <div className="flex justify-between text-amber-700 font-bold">
                <span>Customer Debt:</span>
                <span className="font-mono">Rs. {debt.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="text-center text-[10px] text-slate-500 border-t border-slate-200 pt-3">
            <p className="font-bold">
              {withGst 
                ? (isWadaana ? 'THANK YOU FOR CHOOSING WADAANA' : 'THANK YOU FOR CHOOSING AQUASPHERE') 
                : 'THANK YOU FOR CHOOSING US'}
            </p>
            <p className="mt-0.5">This is a computer generated receipt</p>
          </div>
        </div>

        {/* Modal Actions */}
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
            title="Copy receipt text for WhatsApp / SMS"
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
            title="Copy receipt as PNG image for WhatsApp"
          >
            {copiedImage ? <Check size={14} className="text-emerald-600" /> : <ImageIcon size={14} />}
            {copiedImage ? 'Image Copied!' : 'Copy Image (WhatsApp)'}
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
            onClick={async () => {
              await handleCopyImage();
              const text = formatCounterSaleWhatsApp(receiptSale, items, subtotal, paid, debt, isWadaana, user, withGst);
              openWhatsAppWeb(receiptSale.customer?.phone, text);
              toast.success('Opening WhatsApp! Paste the receipt image (Ctrl+V) into chat.');
            }}
            className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-xs"
            title="Copy receipt image to clipboard & open WhatsApp"
          >
            <Send size={14} /> Send Receipt (WhatsApp)
          </button>
        </div>
      </div>
    </div>
  );
}

