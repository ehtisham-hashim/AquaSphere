import { useState } from 'react';
import { X, Droplet, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL as API } from '../../utils/api';
import { getCompanyFromCookie } from '../../utils/companyCookie';

export default function BottleAdjustmentModal({ customer, onClose, onSuccess }) {
  const [type, setType] = useState('RETURNED_GOOD');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!customer) return null;

  const currentBalance = parseInt(customer.cachedBottleBalance || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      return setError('Please enter a valid quantity greater than zero.');
    }

    const isReturnType = ['RETURNED_GOOD', 'RETURNED_BROKEN', 'MARKED_LOST'].includes(type);
    if (isReturnType && qty > currentBalance) {
      return setError(`Cannot retrieve more than ${currentBalance} bottles.`);
    }

    setSubmitting(true);
    try {
      const tenant = getCompanyFromCookie();
      const res = await fetch(`${API}/bottles/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        credentials: 'include',
        body: JSON.stringify({
          customerId: customer.id,
          type,
          quantity: qty,
          reason: reason.trim() || `Customer bottle adjustment (${type})`
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to record bottle transaction');

      toast.success(`Successfully updated bottle ledger for ${customer.name}`);
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
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-600 uppercase tracking-wider">
              <Droplet size={14} /> 19L Bottle Custody & Ledger
            </div>
            <h3 className="text-lg font-black text-slate-800 mt-0.5">{customer.name}</h3>
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

          <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100 flex justify-between items-center">
            <div>
              <span className="text-xs font-semibold text-sky-800 block">Bottles in Customer Custody</span>
              <span className="text-2xl font-black text-sky-950">{currentBalance} Bottles</span>
            </div>
            <Droplet size={32} className="text-sky-400 opacity-60" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Action Type *</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 focus:border-sky-500 outline-none text-sm font-bold bg-white text-slate-800"
            >
              <option value="RETURNED_GOOD">↩️ Retrieve Empty Bottle (Good Condition)</option>
              <option value="RETURNED_BROKEN">💔 Retrieve Broken / Damaged Bottle</option>
              <option value="MARKED_LOST">❌ Mark Bottle as Lost / Unrecoverable</option>
              <option value="DELIVERED_TO_CUSTOMER">📦 Manual Bottle Issue (Add to Custody)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Quantity of Bottles *</label>
            <input
              type="number"
              min="1"
              max={['RETURNED_GOOD', 'RETURNED_BROKEN', 'MARKED_LOST'].includes(type) && currentBalance > 0 ? currentBalance : undefined}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 focus:border-sky-500 outline-none text-base font-bold text-slate-900 bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Reason / Note (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Collected empty bottle during visit, or lost by customer"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 focus:border-sky-500 outline-none text-sm font-medium bg-white text-slate-800"
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
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Saving...' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
