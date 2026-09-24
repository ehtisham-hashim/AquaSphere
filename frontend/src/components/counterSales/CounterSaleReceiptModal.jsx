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

        {/* Printable Receipt Body - Compact 80mm POS Thermal Slip */}
        <div id="printable-receipt" className="p-3.5 overflow-y-auto flex-1 font-mono text-[10px] bg-white text-black leading-tight">
          {/* Header */}
          <div className="text-center pb-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-black">
              {isWadaana ? 'WADAANA WATER & BEVERAGES' : 'AQUASPHERE PURE WATER'}
            </h2>
            <p className="text-[9px] font-semibold text-black uppercase tracking-widest mt-0.5">
              Retail Sale • Counter Dispatch
            </p>
            <p className="text-[8px] text-slate-600 mt-0.5">Pure Quality • Safe & Healthy Water</p>
            <div className="border-b border-dashed border-black mt-1.5"></div>
          </div>

          {/* Meta Details */}
          <div className="text-[10px] space-y-1 py-1.5 border-b border-dashed border-black">
            <div className="flex justify-between">
              <span><strong>REC:</strong> {saleId}</span>
              <span>{new Date(receiptSale.createdAt).toLocaleDateString()} {new Date(receiptSale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div><strong>CUST:</strong> {receiptSale.customer?.name || 'Walk-In Cash Customer'}</div>
            <div className="flex justify-between">
              <span><strong>PAY:</strong> {receiptSale.paymentMethod || 'CASH'}</span>
              <span><strong>{debt > 0 ? `DUE: ₨ ${debt.toLocaleString()}` : 'PAID IN FULL'}</strong></span>
            </div>
            <div className="text-slate-600">STAFF: {receiptSale.createdBy?.name || user?.name || 'Staff'} ({receiptSale.createdBy?.role || user?.role || 'POS'})</div>
          </div>

          {/* Itemized Table */}
          <div className="mt-1.5">
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="border-b border-dashed border-black font-bold uppercase text-[9px]">
                  <th className="py-1 text-left w-4">#</th>
                  <th className="py-1 text-left">Item</th>
                  <th className="py-1 text-center w-7">Qty</th>
                  <th className="py-1 text-right w-11">Rate</th>
                  <th className="py-1 text-right w-12">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-slate-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-2 text-center text-slate-400 italic">No items recorded</td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1 text-slate-500 font-mono text-[9px]">{idx + 1}</td>
                      <td className="py-1 font-bold pr-1 leading-snug">{item.name}</td>
                      <td className="py-1 text-center font-bold">{item.qty}</td>
                      <td className="py-1 text-right font-mono text-[9px]">{item.unitPrice > 0 ? item.unitPrice : '—'}</td>
                      <td className="py-1 text-right font-bold font-mono">{item.lineTotal.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="border-b border-dashed border-black mt-1"></div>
          </div>

          {/* Totals Section */}
          <div className="pt-1.5 space-y-0.5 text-[10px]">
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
            <div className="border-t-2 border-b-2 border-double border-black py-1 my-1 flex justify-between font-black text-xs">
              <span>NET TOTAL:</span>
              <span>₨ {total.toLocaleString()}</span>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="text-center pt-2 border-t border-dashed border-black text-[8px] text-slate-600 mt-2">
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

