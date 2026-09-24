import { useState } from 'react';
import { X, Printer, Eye, Download, Loader2 } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { generateA5Pdf } from '../../utils/pdfGenerator';

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
  const [isGenerating, setIsGenerating] = useState(false);

  if (!receiptSale) return null;

  const saleId = receiptSale.saleNumber || receiptSale.id?.substring(0, 8) || 'Receipt';

  const handlePrintA5 = async () => {
    const el = document.getElementById('printable-receipt');
    if (!el) return;
    setIsGenerating(true);
    try {
      await generateA5Pdf(el, `Receipt-${saleId}.pdf`, 'print');
    } catch (err) {
      console.error('Failed to generate A5 receipt PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadA5 = async () => {
    const el = document.getElementById('printable-receipt');
    if (!el) return;
    setIsGenerating(true);
    try {
      await generateA5Pdf(el, `Receipt-${saleId}.pdf`, 'download');
    } catch (err) {
      console.error('Failed to download A5 receipt PDF:', err);
    } finally {
      setIsGenerating(false);
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
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
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

      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150 print:border-none print:shadow-none print:p-0 print:max-w-none print:max-h-none">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0 no-print">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Eye size={18} className="text-brand" /> Counter Sale Receipt
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18}/>
          </button>
        </div>

        {/* Printable Receipt Body */}
        <div id="printable-receipt" className="p-6 overflow-y-auto flex-1 space-y-4 font-sans text-xs bg-white">
          {/* Header */}
          <div className="text-center pb-2">
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">
              {isWadaana ? 'WADAANA WATER & BEVERAGES' : 'AQUASPHERE PURE WATER'}
            </h2>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mt-0.5">
              Retail & Counter Dispatch Receipt
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Pure Quality • Safe & Healthy Drinking Water</p>
            <div className="border-b-2 border-slate-800 mt-2.5"></div>
          </div>

          {/* Meta Details Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Receipt No</span>
              <span className="font-mono font-bold text-slate-900">{saleId}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Date & Time</span>
              <span className="font-medium text-slate-800 font-mono">{new Date(receiptSale.createdAt).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Customer</span>
              <span className="font-bold text-slate-900">{receiptSale.customer?.name || 'Walk-In Cash Customer'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Payment Method</span>
              <span className="font-semibold text-slate-800">{receiptSale.paymentMethod || 'CASH'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Served By</span>
              <span className="font-medium text-slate-700">
                {receiptSale.createdBy?.name || user?.name || 'Staff'} ({receiptSale.createdBy?.role || user?.role || 'POS'})
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Payment Status</span>
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                debt > 0 
                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {debt > 0 ? 'CREDIT / PARTIAL' : 'PAID IN FULL'}
              </span>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden mt-3">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-2 px-3 w-8">#</th>
                  <th className="py-2 px-3">Item Description</th>
                  <th className="py-2 px-3 text-center w-16">Qty</th>
                  <th className="py-2 px-3 text-right w-24">Rate (₨)</th>
                  <th className="py-2 px-3 text-right w-24">Amount (₨)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-3 text-center text-slate-400 italic">No items recorded</td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{item.name}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">{item.qty}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {item.unitPrice > 0 ? `₨ ${item.unitPrice.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        ₨ {item.lineTotal.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="flex justify-end pt-2">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Total Bill:</span>
                <span className="font-mono font-bold text-slate-900">₨ {total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Amount Paid:</span>
                <span className="font-mono font-bold text-emerald-700">₨ {paid.toLocaleString()}</span>
              </div>
              {debt > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-amber-700 font-semibold">Customer Debt:</span>
                  <span className="font-mono font-bold text-amber-700">₨ {debt.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 border-t-2 border-slate-900 font-bold text-sm">
                <span>Net Total:</span>
                <span className="font-mono text-brand">₨ {total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Signature Lines */}
          <div className="grid grid-cols-2 gap-8 pt-8 pb-2 border-t border-slate-200 mt-4 text-xs text-slate-600">
            <div>
              <div className="border-b border-slate-300 w-36 mb-1"></div>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Customer Signature</span>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="border-b border-slate-300 w-36 mb-1"></div>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Authorized Stamp / Sign</span>
            </div>
          </div>

          {/* Bottom Receipt Notice */}
          <div className="text-center pt-2 border-t border-dashed border-slate-200 text-[10px] text-slate-400">
            Thank you for choosing {isWadaana ? 'Wadaana' : 'AquaSphere'}! • Computer generated receipt.
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 shrink-0 no-print">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-4"
          >
            Close
          </button>
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleDownloadA5}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 text-slate-700 hover:text-slate-900"
            title="Download PDF"
          >
            <Download size={14} /> PDF
          </button>
          <button
            type="button"
            disabled={isGenerating}
            onClick={handlePrintA5}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
