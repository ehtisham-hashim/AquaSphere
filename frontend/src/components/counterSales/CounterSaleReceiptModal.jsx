import { X, Printer, Eye } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

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
  if (!receiptSale) return null;

  // Use normalized items if available, otherwise parse legacy productType string
  let items = [];
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
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 80mm;
            margin: 0 auto;
            padding: 8px;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in duration-150 print:border-none print:shadow-none print:p-0">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3 no-print">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
            <Eye size={18} className="text-brand" /> Counter Sale Receipt
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18}/>
          </button>
        </div>

        <div id="printable-receipt" className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 font-sans text-xs">
          <div className="text-center border-b border-dashed border-slate-300 pb-2">
            <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">{isWadaana ? 'Wadaana' : 'AquaSphere'}</h4>
            <p className="text-[11px] text-slate-500">Retail & Counter Dispatch Receipt</p>
          </div>

          <div className="space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Sale ID:</span>
              <span className="font-mono font-bold text-slate-900">{receiptSale.saleNumber || receiptSale.id.substring(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Date & Time:</span>
              <span className="font-medium text-slate-800 font-mono">{new Date(receiptSale.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Customer:</span>
              <span className="font-bold text-slate-900">{receiptSale.customer?.name || 'Walk-In Cash Customer'}</span>
            </div>
          </div>

          {/* Itemized Purchased List */}
          <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1.5">
            <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block">Items Purchased</span>
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-semibold text-slate-800">{item.name} × {item.qty}</span>
                  {item.unitPrice > 0 && <span className="text-[10px] text-slate-400 block font-mono">@ Rs. {item.unitPrice.toLocaleString()}</span>}
                </div>
                {item.lineTotal > 0 && <span className="font-mono font-bold text-slate-900">Rs. {item.lineTotal.toLocaleString()}</span>}
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between border-t border-slate-300 pt-1.5 text-sm font-bold text-slate-900">
              <span>Total Bill:</span>
              <span className="font-mono text-brand">Rs. {total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Amount Paid:</span>
              <span className="font-mono font-bold text-emerald-600">Rs. {paid.toLocaleString()}</span>
            </div>
            {debt > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Customer Debt:</span>
                <span className="font-mono font-bold text-amber-600">Rs. {debt.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Payment Method:</span>
              <span className="font-semibold">{receiptSale.paymentMethod || 'CASH'}</span>
            </div>
          </div>

          <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-400">
            Recorded By: {receiptSale.createdBy?.name || user?.name || 'Staff'} ({receiptSale.createdBy?.role || user?.role || 'POS'})
            <br />Thank you for your business!
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2 no-print">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-4"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
          >
            <Printer size={14} /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
