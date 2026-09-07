import { Printer } from 'lucide-react';

export default function PrintPurchaseModal({ purchase, onClose }) {
  if (!purchase) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100 p-8 space-y-6">
        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--brand)]">PURCHASE INVOICE</h2>
            <p className="text-xs text-slate-500 mt-0.5">Official Purchase Voucher</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-mono font-bold text-slate-800">{purchase.invoiceNo || purchase.id}</div>
            <div className="text-xs text-slate-500">{new Date(purchase.purchaseDate).toLocaleDateString()}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-400 font-medium block">Vendor:</span>
            <span className="font-bold text-slate-800 text-sm">{purchase.vendor?.name}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Delivered Location:</span>
            <span className="font-bold text-[var(--brand)] text-sm">{purchase.deliveredTo || 'FACTORY'}</span>
          </div>
        </div>

        <div>
          <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-100 font-bold text-slate-700">
              <tr>
                <th className="p-2.5">Item</th>
                <th className="p-2.5">Qty</th>
                <th className="p-2.5">Unit Price</th>
                <th className="p-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {purchase.items?.map((it, idx) => (
                <tr key={idx}>
                  <td className="p-2.5 font-sans font-semibold text-slate-800">{it.item?.name}</td>
                  <td className="p-2.5 text-slate-600">{Number(it.quantity)} {it.item?.unit}</td>
                  <td className="p-2.5 text-slate-600">Rs {Number(it.unitPrice).toLocaleString()}</td>
                  <td className="p-2.5 text-right font-bold text-slate-800">Rs {Number(it.total).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-slate-200">
          <span className="font-bold text-slate-700 text-sm">Total Payable</span>
          <span className="text-xl font-bold font-mono text-[var(--brand)]">Rs {Number(purchase.grandTotal).toLocaleString('en-PK')}</span>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
          <button onClick={() => window.print()} className="btn-primary flex items-center gap-1.5">
            <Printer size={14} /> Print Now
          </button>
        </div>
      </div>
    </div>
  );
}
