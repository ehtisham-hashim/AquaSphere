import { useState } from 'react';
import { X, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL as API } from '../../utils/api';
import { getCompanyFromCookie } from '../../utils/companyCookie';

export default function RecordPaymentModal({ order, onClose, onSuccess }) {
  const [cashAmount, setCashAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!order) return null;

  const tenant = getCompanyFromCookie();
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

      toast.success(`Payment of Rs. ${amount.toLocaleString()} recorded successfully!`);
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider">
              <CreditCard size={14} /> Record Order Payment
            </div>
            <h3 className="text-lg font-black text-slate-800 mt-0.5">Order #{order.id?.slice(0, 6).toUpperCase()}</h3>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white border border-slate-200 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Customer:</span>
              <span className="font-bold text-slate-800">{order.customer?.name}</span>
            </div>
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Order Total:</span>
              <span className="font-bold text-slate-900">Rs. {total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Already Paid:</span>
              <span className="font-bold text-emerald-700">Rs. {alreadyPaid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-black border-t border-slate-200 pt-2 text-sm">
              <span>Outstanding Debt:</span>
              <span className="text-rose-600">Rs. {outstanding.toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Amount Received (Rs) *</label>
            <input
              type="number"
              step="any"
              min="1"
              max={outstanding > 0 ? outstanding : undefined}
              placeholder={`Max Rs. ${outstanding.toLocaleString()}`}
              value={cashAmount}
              onChange={e => setCashAmount(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none text-base font-bold text-slate-900 bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 outline-none text-sm font-bold bg-white text-slate-800"
            >
              <option value="CASH">💵 Cash</option>
              <option value="BANK_TRANSFER">🏛️ Bank Transfer</option>
              <option value="CHEQUE">📝 Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Remarks / Reference</label>
            <input
              type="text"
              placeholder="e.g. Receipt #8821 or Online ref"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 outline-none text-sm font-medium bg-white text-slate-800"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
