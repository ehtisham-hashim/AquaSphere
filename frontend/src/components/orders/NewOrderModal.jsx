import { useState, useEffect } from 'react';
import { X, Droplets, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

import { API_URL as API } from '../../utils/api';
const INPUT = 'input-field';
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
          expectedDelivery: delivery || null,
          remarks,
          paymentStatus: 'UNPAID',
          bypassCreditCheck: bypassCredit
        })
      });
      const json = await res.json();
      if (json.softBlock) { setSoftBlock(json); return; }
      if (json.success) {
        toast.success('Order placed successfully!');
        onOrderPlaced();
      }
      else toast.error(json.message || 'Failed to place order');
    } catch { toast.error('Network error'); }
    finally { setSubmitting(false); }
  };

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submitOrder(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qty19L, price19L, qty05, price05, qty15, price15, delivery, remarks, orderType]);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden relative">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-white font-bold text-sm">New Order — {customer.name}</div>
            <div className="text-slate-400 text-xs mt-0.5">
              Balance: <span className={parseFloat(customer.cachedBalance) > 0 ? 'text-red-400' : 'text-emerald-400'}>
                Rs. {parseFloat(customer.cachedBalance || 0).toFixed(0)}
              </span>
              {parseFloat(customer.creditLimit) > 0 && <span className="text-slate-500"> / limit Rs. {customer.creditLimit}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
        </div>

        <div className="p-5">
          {/* Step 1 — Type Selection */}
          {step === 1 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Order Type</h4>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setOrderType('NINETEEN_L'); setStep(2); }}
                  className="border-2 border-blue-200 hover:border-blue-500 rounded-xl p-5 text-center transition-all group hover:bg-blue-50">
                  <Droplets size={32} className="mx-auto text-blue-400 group-hover:text-blue-600 mb-2"/>
                  <div className="font-bold text-slate-800 text-sm">19L Water</div>
                  <div className="text-xs text-slate-500 mt-0.5">Refillable bottles</div>
                </button>
                <button onClick={() => { setOrderType('PET'); setStep(2); }}
                  className="border-2 border-green-200 hover:border-green-500 rounded-xl p-5 text-center transition-all group hover:bg-green-50">
                  <Package size={32} className="mx-auto text-green-400 group-hover:text-green-600 mb-2"/>
                  <div className="font-bold text-slate-800 text-sm">PET Bottles</div>
                  <div className="text-xs text-slate-500 mt-0.5">0.5L or 1.5L packs</div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-600 text-xs underline">← Change type</button>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${orderType === 'NINETEEN_L' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                  {orderType === 'NINETEEN_L' ? '19L Water Order' : 'PET Bottles Order'}
                </span>
              </div>

              {orderType === 'NINETEEN_L' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Quantity (bottles) *</label>
                    <input type="number" min="1" autoFocus className={INPUT} value={qty19L}
                      onChange={e => setQty19L(e.target.value)} placeholder="e.g. 5"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Price / bottle (Rs) *</label>
                    <input type="number" step="0.01" className={INPUT} value={price19L}
                      onChange={e => setPrice19L(e.target.value)} placeholder="200"/>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                    <div className="col-span-2 text-xs font-semibold text-green-700">0.5L Packs</div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Qty (packs)</label>
                      <input type="number" min="0" className={INPUT} value={qty05}
                        onChange={e => setQty05(e.target.value)} placeholder="0"/>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Price / pack</label>
                      <input type="number" step="0.01" className={INPUT} value={price05}
                        onChange={e => setPrice05(e.target.value)} placeholder="0"/>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-3 bg-teal-50 rounded-xl border border-teal-100">
                    <div className="col-span-2 text-xs font-semibold text-teal-700">1.5L Packs</div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Qty (packs)</label>
                      <input type="number" min="0" className={INPUT} value={qty15}
                        onChange={e => setQty15(e.target.value)} placeholder="0"/>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Price / pack</label>
                      <input type="number" step="0.01" className={INPUT} value={price15}
                        onChange={e => setPrice15(e.target.value)} placeholder="0"/>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Expected Delivery</label>
                  <input type="date" className={INPUT} value={delivery} onChange={e => setDelivery(e.target.value)}/>
                </div>
                <div className="flex flex-col justify-end">
                  <div className="bg-slate-900 text-white rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wide">Total</div>
                    <div className="text-xl font-bold">Rs. {total.toFixed(0)}</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Remarks / Delivery Notes</label>
                <input className={INPUT} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. call before arriving, share with driver"/>
              </div>

              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={onClose}
                  className="flex-1 py-3 text-slate-600 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={() => submitOrder(false)} disabled={submitting || !buildItems()}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                  {submitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Placing...</>
                    : <><CheckCircle size={16}/> Place Order <span className="text-slate-400 text-xs">Ctrl+↵</span></>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Credit Soft-Block Overlay */}
        {softBlock && (
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-5 rounded-2xl z-20">
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 text-center shadow-2xl border border-amber-200">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={24} className="text-amber-600"/>
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Credit Limit Warning</h4>
                <p className="text-xs text-slate-600 mt-2 bg-amber-50 border border-amber-100 rounded-lg p-3">{softBlock.message}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSoftBlock(null)}
                  className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 font-medium">
                  Adjust Order
                </button>
                <button onClick={() => submitOrder(true)}
                  className="flex-1 py-2.5 text-sm text-white bg-amber-600 hover:bg-amber-700 rounded-xl font-bold">
                  Proceed Anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
