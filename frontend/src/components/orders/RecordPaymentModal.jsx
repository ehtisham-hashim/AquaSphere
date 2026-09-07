import { useState } from 'react';
import { X, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL as API } from '../../utils/api';
import { useTenant } from '../../context/TenantContext';

export default function RecordPaymentModal({ order, onClose, onSuccess }) {
  const { tenant } = useTenant();
  const [cashAmount, setCashAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!order) return null;

  const total = order.items?.reduce((s, i) => s + (parseFloat(i.price) * i.quantity), 0) || 0;
  const alreadyPaid = order.payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || (order.paymentStatus === 'PAID' ? total : 0);
  const outstanding = Math.max(0, total - alreadyPaid);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(cashAmount);
    if (isNaN(amount) || amount <= 0) {
      return setError('Please enter a valid payment amount greater than zero.');
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/orders/${order.id}/deliver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        credentials: 'include',
        body: JSON.stringify({
          qtyDelivered: 0,
          cashReceived: amount,
          paymentMethod,
          remarks
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to record payment');

      toast.success(`Payment of ₨ ${amount.toLocaleString()} recorded successfully!`);
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-muted text-brand-primary">
              <CreditCard size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Record Payment</h3>
              <p className="text-[11px] text-slate-500 font-mono">Order #{order.id.substring(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono">
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Amount</span>
              <span className="font-bold text-slate-800">₨ {total.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Outstanding Due</span>
              <span className="font-bold text-rose-600">₨ {outstanding.toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Amount to Collect (PKR) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">₨</span>
              <input
                type="number"
                step="any"
                required
                autoFocus
                placeholder={outstanding.toString()}
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                className="input-base pl-8 font-mono font-bold text-slate-800 text-sm"
              />
            </div>
            {outstanding > 0 && (
              <button
                type="button"
                onClick={() => setCashAmount(outstanding.toString())}
                className="text-[11px] text-brand-primary font-bold hover:underline mt-1 block"
              >
                Pay Full Outstanding (₨ {outstanding.toLocaleString()})
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="select-base text-xs font-medium"
            >
              <option value="CASH">Cash</option>
              <option value="ONLINE">Bank / Online Transfer</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Remarks (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Cleared via Bank Alfalah"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="input-base text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-secondary text-xs py-2 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              {submitting ? 'Recording...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
