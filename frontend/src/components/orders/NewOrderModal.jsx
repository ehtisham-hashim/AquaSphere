import { useState } from 'react';
import { X, Droplets, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

import { API_URL as API } from '../../utils/api';
const today = new Date().toISOString().split('T')[0];

export default function NewOrderModal({ customer, items, onClose, onOrderPlaced }) {
  const [step, setStep] = useState(1); // 1=type, 2=details
  const [orderType, setOrderType] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [softBlock, setSoftBlock] = useState(null);

  // 19L fields
  const [qty19L, setQty19L] = useState('');
  const [price19L, setPrice19L] = useState('');

  // PET fields
  const [qty05, setQty05] = useState('');
  const [price05, setPrice05] = useState('');
  const [qty15, setQty15] = useState('');
  const [price15, setPrice15] = useState('');

  const [delivery, setDelivery] = useState(today);
  const [remarks, setRemarks] = useState('');

  const item19L = items.find(i => i.name.toLowerCase().includes('19l') || i.name.toLowerCase().includes('19 l'));
  const item05 = items.find(i => i.name.toLowerCase().includes('500') || i.name.toLowerCase().includes('0.5'));
  const item15 = items.find(i => i.name.toLowerCase().includes('1.5') || i.name.toLowerCase().includes('1500'));

  const total = orderType === 'NINETEEN_L'
    ? (parseFloat(qty19L) || 0) * (parseFloat(price19L) || 0)
    : ((parseFloat(qty05) || 0) * (parseFloat(price05) || 0)) + ((parseFloat(qty15) || 0) * (parseFloat(price15) || 0));

  const buildItems = () => {
    if (orderType === 'NINETEEN_L') {
      if (!item19L || !qty19L) return null;
      return [{ itemId: item19L.id, quantity: parseInt(qty19L), price: parseFloat(price19L) }];
    }
    const arr = [];
    if (qty05 && item05) arr.push({ itemId: item05.id, quantity: parseInt(qty05), price: parseFloat(price05 || 0) });
    if (qty15 && item15) arr.push({ itemId: item15.id, quantity: parseInt(qty15), price: parseFloat(price15 || 0) });
    return arr.length > 0 ? arr : null;
  };

  const submitOrder = async (bypassCredit = false) => {
    const orderItems = buildItems();
    if (!orderItems) return;
    setSubmitting(true);
    setSoftBlock(null);
    try {
      const res = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerId: customer.id,
          type: orderType,
          items: orderItems,
          expectedDelivery: delivery,
          remarks: remarks || undefined,
          bypassCredit
        })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.softBlock) {
          setSoftBlock(data);
          setSubmitting(false);
          return;
        }
        throw new Error(data.message || 'Failed to place order');
      }
      toast.success('Order placed successfully!');
      onOrderPlaced();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-800">New Order</h3>
            <p className="text-[11px] text-slate-500 font-medium">Customer: <span className="font-bold text-slate-700">{customer.name}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Select Order Type</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setOrderType('NINETEEN_L'); setStep(2); }}
                  className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-slate-200 hover:border-brand-primary rounded-xl transition-all group bg-slate-50/50 hover:bg-brand-muted/30"
                >
                  <Droplets size={28} className="text-brand-primary group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-slate-800 text-xs">19L Bottles</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setOrderType('PET_BOTTLES'); setStep(2); }}
                  className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-slate-200 hover:border-brand-primary rounded-xl transition-all group bg-slate-50/50 hover:bg-brand-muted/30"
                >
                  <Package size={28} className="text-brand-primary group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-slate-800 text-xs">Small Bottles (PET)</span>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 text-xs">
              {orderType === 'NINETEEN_L' ? (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">19L Quantity</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 5"
                      value={qty19L}
                      onChange={e => setQty19L(e.target.value)}
                      className="input-base font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Price per Bottle</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 150"
                      value={price19L}
                      onChange={e => setPrice19L(e.target.value)}
                      className="input-base font-mono text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">500ml Qty</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={qty05}
                        onChange={e => setQty05(e.target.value)}
                        className="input-base font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">500ml Price</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={price05}
                        onChange={e => setPrice05(e.target.value)}
                        className="input-base font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">1.5L Qty</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={qty15}
                        onChange={e => setQty15(e.target.value)}
                        className="input-base font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">1.5L Price</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={price15}
                        onChange={e => setPrice15(e.target.value)}
                        className="input-base font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Expected Delivery</label>
                  <input
                    type="date"
                    value={delivery}
                    onChange={e => setDelivery(e.target.value)}
                    className="input-base font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Remarks</label>
                  <input
                    type="text"
                    placeholder="Optional notes..."
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    className="input-base text-xs"
                  />
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono">
                <span className="text-slate-600 font-bold uppercase text-[10px]">Estimated Total:</span>
                <span className="font-mono font-black text-sm text-slate-900">₨ {total.toLocaleString()}</span>
              </div>

              {softBlock && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle size={14} className="text-amber-600" />
                    <span>Credit Warning</span>
                  </div>
                  <p className="text-[11px]">{softBlock.message || 'This order exceeds the customer credit threshold.'}</p>
                  <button
                    type="button"
                    onClick={() => submitOrder(true)}
                    className="btn-danger text-xs py-1 px-3 w-full"
                  >
                    Bypass & Place Order
                  </button>
                </div>
              )}

              <div className="flex justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={submitting || total <= 0}
                  onClick={() => submitOrder(false)}
                  className="btn-primary text-xs py-2 px-5 flex items-center gap-1.5"
                >
                  <CheckCircle size={14} />
                  {submitting ? 'Placing Order...' : 'Confirm Order'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
