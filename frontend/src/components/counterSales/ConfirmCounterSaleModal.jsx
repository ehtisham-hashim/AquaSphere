import { X } from 'lucide-react';
import { COUNTER_PRODUCTS } from '../../constants/counterSale';

export default function ConfirmCounterSaleModal({
  isOpen,
  onClose,
  onConfirm,
  liveSaleNumber,
  selectedProductId,
  productQuantity,
  cashCollected,
  numericCredit,
  user
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in duration-150">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="text-lg font-bold text-slate-800">Confirm Counter Sale</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18}/>
          </button>
        </div>

        <div className="space-y-2 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex justify-between">
            <span className="font-semibold text-slate-500">Sale Number:</span>
            <span className="font-mono font-bold text-brand">{liveSaleNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-500">Selected Product:</span>
            <span className="font-bold text-slate-900">
              {COUNTER_PRODUCTS.find(p => p.id === selectedProductId)?.name} (x{productQuantity})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-500">Cash Collected:</span>
            <span className="font-mono font-bold text-emerald-600">Rs. {Number(cashCollected || 0).toLocaleString()}</span>
          </div>
          {numericCredit > 0 && (
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Credit Amount:</span>
              <span className="font-mono font-bold text-amber-600">Rs. {numericCredit.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900 text-base">
            <span>Total Amount:</span>
            <span className="font-mono font-bold text-brand">Rs. {(Number(cashCollected || 0) + numericCredit).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 pt-1">
            <span>Recorded By:</span>
            <span>{user?.role} ({user?.name})</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 text-center font-medium">
          Are you sure you want to record this retail counter sale? Finished goods stock & water will be deducted automatically.
        </p>

        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-4"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-primary text-xs py-2 px-5"
          >
            Yes, Record Sale
          </button>
        </div>
      </div>
    </div>
  );
}
