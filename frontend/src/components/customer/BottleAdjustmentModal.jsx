import { useState, useEffect } from 'react';
import { X, Droplet, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL as API, clearCache } from '../../utils/api';
import { useTenant } from '../../context/TenantContext';

export default function BottleAdjustmentModal({ customer, onClose, onSuccess }) {
  const { tenant } = useTenant();
  const [returnableItems, setReturnableItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [loadingItems, setLoadingItems] = useState(true);
  const [type, setType] = useState('RETURNED_GOOD');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadReturnableItems() {
      try {
        setLoadingItems(true);
        const res = await fetch(`${API}/items?type=RAW_MATERIAL`, {
          headers: { 'x-tenant': tenant },
          credentials: 'include'
        });
        const json = await res.json();
        if (json.success && isMounted) {
          const returnables = (json.data || []).filter(i => Boolean(i.isReturnable));
          setReturnableItems(returnables);
          if (returnables.length > 0) {
            // Pick matching item from customer custody if exists, else first returnable
            const heldWithCustody = returnables.find(i => 
              customer.returnableCustody?.some(rc => rc.itemId === i.id && Number(rc.inCustody ?? rc.balance ?? 0) > 0)
            );
            setSelectedItemId(heldWithCustody?.id || returnables[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load returnable items:', err);
      } finally {
        if (isMounted) setLoadingItems(false);
      }
    }
    loadReturnableItems();
    return () => { isMounted = false; };
  }, [tenant, customer]);

  if (!customer) return null;

  const currentOverallBalance = parseInt(customer.cachedBottleBalance || 0);
  const selectedCustody = customer.returnableCustody?.find(rc => rc.itemId === selectedItemId);
  const selectedItemBalance = selectedCustody 
    ? Number(selectedCustody.inCustody ?? selectedCustody.balance ?? 0) 
    : currentOverallBalance;
  const selectedItem = returnableItems.find(i => i.id === selectedItemId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      return setError('Please enter a valid quantity greater than zero.');
    }

    const isReturnType = ['RETURNED_GOOD', 'RETURNED_BROKEN', 'MARKED_LOST'].includes(type);
    if (isReturnType && qty > selectedItemBalance && selectedItemBalance > 0) {
      return setError(`Cannot retrieve more than ${selectedItemBalance} ${selectedItem?.unit || 'units'} currently held by customer.`);
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/bottles/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        credentials: 'include',
        body: JSON.stringify({
          customerId: customer.id,
          itemId: selectedItemId || undefined,
          type,
          quantity: qty,
          reason: reason.trim() || `Customer container adjustment (${type})`
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to record returnable transaction');

      clearCache('bottles');
      clearCache('customers');
      clearCache('inventory');
      clearCache('items');
      clearCache('orders');

      toast.success(`Successfully updated custody ledger for ${customer.name}`);
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
              <RefreshCw size={14} /> Returnable Custody & Ledger
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
              <span className="text-xs font-semibold text-sky-800 block">
                {selectedItem ? `${selectedItem.name} in Customer Custody` : 'Total Containers in Custody'}
              </span>
              <span className="text-2xl font-black text-sky-950">
                {selectedItemBalance} {selectedItem?.unit || 'Units'}
              </span>
            </div>
            <Droplet size={32} className="text-sky-400 opacity-60" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Returnable Container Type *</label>
            {loadingItems ? (
              <div className="text-xs text-slate-400 py-2 flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Loading containers...
              </div>
            ) : returnableItems.length > 0 ? (
              <select
                value={selectedItemId}
                onChange={e => setSelectedItemId(e.target.value)}
                className="select-base"
              >
                {returnableItems.map(item => {
                  const cust = customer.returnableCustody?.find(rc => rc.itemId === item.id);
                  const custQty = cust ? Number(cust.inCustody ?? cust.balance ?? 0) : null;
                  return (
                    <option key={item.id} value={item.id}>
                      {item.name} {custQty !== null ? `(Custody: ${custQty})` : ''} — Plant Stock: {item.cachedQty} {item.unit}
                    </option>
                  );
                })}
              </select>
            ) : (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                No raw materials flagged as returnable. Using default 19L bottle ledger.
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Action Type *</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="select-base"
            >
              <option value="RETURNED_GOOD">↩️ Retrieve Empty Container (Good Condition)</option>
              <option value="RETURNED_BROKEN">💔 Retrieve Broken / Damaged Container</option>
              <option value="MARKED_LOST">❌ Mark Container as Lost / Unrecoverable</option>
              <option value="DELIVERED_TO_CUSTOMER">📦 Manual Container Issue (Add to Custody)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Quantity ({selectedItem?.unit || 'Units'}) *
            </label>
            <input
              type="number"
              min="1"
              max={['RETURNED_GOOD', 'RETURNED_BROKEN', 'MARKED_LOST'].includes(type) && selectedItemBalance > 0 ? selectedItemBalance : undefined}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="input-base font-mono"
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
              className="input-base"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex items-center gap-1.5"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              <span>{submitting ? 'Saving...' : 'Record Transaction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
