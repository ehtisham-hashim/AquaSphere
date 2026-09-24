import { useState } from 'react';
import { X, Printer, Eye, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '../../context/TenantContext';
import { copyTextToClipboard, formatCounterSaleWhatsApp } from '../../utils/receiptFormatter';

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
  const [copied, setCopied] = useState(false);

  if (!receiptSale) return null;

  const saleId = receiptSale.saleNumber || receiptSale.id?.substring(0, 8) || 'Receipt';

  const handlePrint = () => {
    window.print();
  };

  const handleCopyWhatsApp = async () => {
    try {
      const text = formatCounterSaleWhatsApp(receiptSale, items, total, paid, debt, isWadaana, user);
      const ok = await copyTextToClipboard(text);
      if (ok) {
        setCopied(true);
        toast.success('Receipt copied! Paste (Ctrl+V) directly into WhatsApp.');
        setTimeout(() => setCopied(false), 2500);
      } else {
        toast.error('Failed to copy to clipboard.');
      }
    } catch (err) {
      console.error('Copy failed:', err);
      toast.error('Failed to copy to clipboard.');
    }
  };

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
          #printable-receipt, #printable-receipt * {
            visibility: visible !important;
          }
          #printable-receipt {
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
          #printable-receipt * {
            color: #000000 !important;
            border-color: #000000 !important;
            background-color: transparent !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150 print-modal-box print:border-none print:shadow-none print:p-0 print:max-w-none print:max-h-none">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0 no-print">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Eye size={18} className="text-slate-800" /> Counter Sale Receipt
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18}/>
          </button>
        </div>

        {/* Printable Receipt Body */}
        <div id="printable-receipt" className="p-8 overflow-y-auto flex-1 space-y-4 font-sans text-xs bg-white text-black">
          {/* Header */}
          <div className="text-center pb-3 border-b-2 border-black">
            <h2 className="text-2xl font-black text-black uppercase tracking-wider">
              {isWadaana ? 'WADAANA WATER & BEVERAGES' : 'AQUASPHERE PURE WATER'}
            </h2>
            <p className="text-xs font-bold text-black uppercase tracking-widest mt-1">
              Retail Sale Receipt • Counter Dispatch
            </p>
            <p className="text-[11px] text-slate-600 print:text-black mt-0.5">Pure Quality • Safe & Healthy Drinking Water</p>
          </div>

          {/* Meta Details Grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs py-2 border-b border-black">
            <div>
              <span className="font-bold text-black uppercase text-[10px] tracking-wider block">Receipt No:</span>
              <span className="font-mono font-black text-black text-sm">{saleId}</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-black uppercase text-[10px] tracking-wider block">Date & Time:</span>
              <span className="font-semibold text-black font-mono">{new Date(receiptSale.createdAt).toLocaleString()}</span>
            </div>
            <div>
              <span className="font-bold text-black uppercase text-[10px] tracking-wider block">Customer:</span>
              <span className="font-bold text-black">{receiptSale.customer?.name || 'Walk-In Cash Customer'}</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-black uppercase text-[10px] tracking-wider block">Payment Method:</span>
              <span className="font-bold text-black uppercase">{receiptSale.paymentMethod || 'CASH'}</span>
            </div>
            <div>
              <span className="font-bold text-black uppercase text-[10px] tracking-wider block">Served By:</span>
              <span className="font-medium text-black">
                {receiptSale.createdBy?.name || user?.name || 'Staff'} ({receiptSale.createdBy?.role || user?.role || 'POS'})
              </span>
            </div>
            <div className="text-right">
              <span className="font-bold text-black uppercase text-[10px] tracking-wider block">Payment Status:</span>
              <span className="font-mono font-bold text-black">
                {debt > 0 ? `[ CREDIT / DUE: ₨ ${debt.toLocaleString()} ]` : '[ PAID IN FULL ]'}
              </span>
            </div>
          </div>

          {/* Itemized Table */}
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
                  items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-300 print:border-black">
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-600 print:text-black">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-black">{item.name}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-black">{item.qty}</td>
                      <td className="py-2 px-3 text-right font-mono text-black">
                        {item.unitPrice > 0 ? `₨ ${item.unitPrice.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-black">
                        ₨ {item.lineTotal.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="flex justify-end pt-3">
            <div className="w-80 space-y-1.5 text-xs border-t border-black pt-2">
              <div className="flex justify-between py-0.5">
                <span className="font-semibold text-black">Total Bill:</span>
                <span className="font-mono font-bold text-black">₨ {total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="font-semibold text-black">Amount Paid:</span>
                <span className="font-mono font-bold text-black">₨ {paid.toLocaleString()}</span>
              </div>
              {debt > 0 && (
                <div className="flex justify-between py-0.5">
                  <span className="font-bold text-black">Customer Debt:</span>
                  <span className="font-mono font-bold text-black">₨ {debt.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t-2 border-b-2 border-black font-black text-sm mt-1">
                <span>NET TOTAL:</span>
                <span className="font-mono">₨ {total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Signature Lines */}
          <div className="grid grid-cols-2 gap-8 pt-10 pb-2 mt-6 text-xs text-black">
            <div>
              <div className="border-b border-black w-44 mb-1"></div>
              <span className="text-[10px] font-bold uppercase tracking-wider">Customer Signature</span>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="border-b border-black w-44 mb-1"></div>
              <span className="text-[10px] font-bold uppercase tracking-wider">Authorized Stamp / Sign</span>
            </div>
          </div>

          {/* Bottom Receipt Notice */}
          <div className="text-center pt-3 border-t border-black text-[10px] font-medium text-slate-600 print:text-black mt-3">
            Thank you for choosing {isWadaana ? 'Wadaana Water & Beverages' : 'AquaSphere Pure Water'}! • Computer Generated POS Slip
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 shrink-0 no-print flex-wrap">
          <button
            type="button"
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
            title="Copy receipt for WhatsApp"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy for WhatsApp'}
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
