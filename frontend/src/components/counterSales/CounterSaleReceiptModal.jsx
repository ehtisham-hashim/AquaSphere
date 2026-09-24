import { useState } from 'react';
import { X, Printer, Eye, Copy, Check, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '../../context/TenantContext';
import {
  copyTextToClipboard,
  formatCounterSaleWhatsApp,
  printReceiptElement,
  renderReceiptToCanvas,
  copyCanvasImageToClipboard
} from '../../utils/receiptFormatter';

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

  const total = Number(receiptSale.totalAmount ?? (Number(receiptSale.cashCollected || 0) + Number(receiptSale.creditAmount || 0)));
  const paid = Number(receiptSale.amountPaid ?? Number(receiptSale.cashCollected || 0));
  const debt = Number(receiptSale.debtAmount ?? Number(receiptSale.creditAmount || 0));

  const handlePrint = () => {
    printReceiptElement('printable-receipt');
  };

  const handleCopyImage = async () => {
    try {
      const company = isWadaana ? 'WADAANA WATER & BEVERAGES' : 'AQUASPHERE PURE WATER';
      const canvas = renderReceiptToCanvas({
        title: company,
        subtitle: 'Retail Sale Receipt • Counter Dispatch',
        receiptNoLabel: 'RECEIPT NO',
        receiptNo: saleId,
        dateStr: new Date(receiptSale.createdAt).toLocaleString(),
        customerName: receiptSale.customer?.name || 'Walk-In Cash Customer',
        paymentMethod: receiptSale.paymentMethod || 'CASH',
        servedBy: receiptSale.createdBy?.name || user?.name || 'Staff',
        statusValue: debt > 0 ? `CREDIT (DUE: Rs. ${debt.toLocaleString()})` : 'PAID IN FULL',
        items,
        summaryRows: [
          { label: 'TOTAL BILL', value: total },
          { label: 'AMOUNT PAID', value: paid },
          ...(debt > 0 ? [{ label: 'CUSTOMER DEBT', value: debt }] : [])
        ],
        netTotal: total,
        footerNote: `THANK YOU FOR CHOOSING ${isWadaana ? 'WADAANA' : 'AQUASPHERE'}!`
      });

      await copyCanvasImageToClipboard(canvas);
      setCopiedImage(true);
      toast.success('Receipt image copied! Paste (Ctrl+V) directly into WhatsApp.');
      setTimeout(() => setCopiedImage(false), 2500);
    } catch (err) {
      console.warn('Canvas image copy failed, falling back to text:', err);
      handleCopyText();
    }
  };

  const handleCopyText = async () => {
    try {
      const text = formatCounterSaleWhatsApp(receiptSale, items, total, paid, debt, isWadaana, user);
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
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Eye size={18} className="text-slate-800" /> Counter Sale Receipt
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18}/>
          </button>
        </div>

        {/* Printable Receipt Body - Professional Times New Roman Layout */}
        <div 
          id="printable-receipt" 
          className="p-5 overflow-y-auto flex-1 bg-white text-black leading-normal selection:bg-slate-200"
          style={{ fontFamily: '"Times New Roman", Times, "Tinos", serif' }}
        >
          {/* Header */}
          <div className="text-center pb-2">
            <h2 className="text-lg font-bold uppercase tracking-wider text-black">
              {isWadaana ? 'WADAANA WATER & BEVERAGES' : 'AQUASPHERE PURE WATER'}
            </h2>
            <p className="text-xs font-bold text-black uppercase tracking-widest mt-1">
              Retail Sale • Counter Dispatch
            </p>
            <p className="text-[11px] italic text-slate-700 mt-0.5">Pure Quality • Safe & Healthy Water</p>
            <div className="border-b border-dashed border-black/80 my-2.5"></div>
          </div>

          {/* Meta Details */}
          <div className="text-xs space-y-1.5 py-1 border-b border-dashed border-black/80">
            <div className="flex justify-between items-center">
              <span><strong>REC:</strong> {saleId}</span>
              <span className="text-slate-800">{new Date(receiptSale.createdAt).toLocaleDateString()} {new Date(receiptSale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div><strong>CUST:</strong> {receiptSale.customer?.name || 'Walk-In Cash Customer'}</div>
            <div className="flex justify-between items-center">
              <span><strong>PAY:</strong> {receiptSale.paymentMethod || 'CASH'}</span>
              <span className="font-bold">{debt > 0 ? `DUE: ₨ ${debt.toLocaleString()}` : 'PAID IN FULL'}</span>
            </div>
            <div className="text-slate-700 text-[11px]">STAFF: {receiptSale.createdBy?.name || user?.name || 'Staff'} ({receiptSale.createdBy?.role || user?.role || 'POS'})</div>
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

          {/* Totals Section */}
          <div className="pt-2.5 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span>Total Bill:</span>
              <span className="font-bold">₨ {total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount Paid:</span>
              <span className="font-bold">₨ {paid.toLocaleString()}</span>
            </div>
            {debt > 0 && (
              <div className="flex justify-between">
                <span>Customer Debt:</span>
                <span className="font-bold">₨ {debt.toLocaleString()}</span>
              </div>
            )}
            <div className="border-t-2 border-b-2 border-double border-black py-2 my-2 flex justify-between font-bold text-sm">
              <span>NET TOTAL:</span>
              <span>₨ {total.toLocaleString()}</span>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="text-center pt-3 border-t border-dashed border-black/80 text-[11px] italic text-slate-700 mt-3">
            THANK YOU FOR CHOOSING {isWadaana ? 'WADAANA' : 'AQUASPHERE'}!
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
            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
          >
            <Printer size={14} /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

