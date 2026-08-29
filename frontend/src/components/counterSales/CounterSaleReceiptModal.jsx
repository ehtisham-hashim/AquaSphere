import { X, Printer, Eye } from 'lucide-react';

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
  if (!receiptSale) return null;

  const productStr = receiptSale.productType || 'CUSTOM';

  // Parse items from productType string
  const items = (productStr.includes('(') || productStr.includes(','))
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

  const cash = Number(receiptSale.cashCollected || 0);
  const credit = Number(receiptSale.creditAmount || 0);
  const total = cash + credit;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in duration-150">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
            <Eye size={18} className="text-emerald-600" /> Counter Sale Details
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18}/>
          </button>
        </div>

        <div id="printable-receipt" className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 font-sans text-xs">
          <div className="text-center border-b border-dashed border-slate-300 pb-2">
            <h4 className="font-extrabold text-sm text-slate-900 uppercase">AquaSphere OS</h4>
            <p className="text-[11px] text-slate-500">Retail & Counter Dispatch Receipt</p>
          </div>

          <div className="space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Sale ID:</span>
              <span className="font-mono font-bold text-slate-900">{receiptSale.saleNumber || receiptSale.id.substring(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Date & Time:</span>
              <span className="font-semibold text-slate-800">{new Date(receiptSale.createdAt).toLocaleString()}</span>
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
                <span className="font-semibold text-slate-800">{item.name} × {item.qty}</span>
                {item.lineTotal > 0 && <span className="font-bold text-slate-900">Rs. {item.lineTotal.toLocaleString()}</span>}
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Cash Paid:</span>
              <span className="font-bold text-emerald-700">Rs. {cash.toLocaleString()}</span>
            </div>
            {credit > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Credit Charged:</span>
                <span className="font-bold text-purple-700">Rs. {credit.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Payment Method:</span>
              <span className="font-semibold">{receiptSale.paymentMethod || 'CASH'}</span>
            </div>
            <div className="flex justify-between border-t border-slate-300 pt-1.5 text-sm font-black text-slate-900">
              <span>Total Amount:</span>
              <span>Rs. {total.toLocaleString()}</span>
            </div>
          </div>

          <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-400">
            Recorded By: {receiptSale.createdBy?.role || user?.role} ({receiptSale.createdBy?.name || user?.name || 'Staff'})
            <br />Thank you for your business!
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
          >
            <Printer size={15} /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
