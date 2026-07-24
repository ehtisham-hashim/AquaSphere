import { useState, useEffect, useCallback } from 'react';
import { X, Droplets, Package, AlertTriangle, CheckCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

export default function NewOrderModal({ customer, onClose, onOrderPlaced }) {
  const today = new Date().toISOString().split('T')[0];
  const [step, setStep] = useState(1); // 1=type, 2=details
  const [orderType, setOrderType] = useState(null);
  const [items, setItems] = useState([]);
  const [softBlockData, setSoftBlockData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    qty19l: 1,
    price19l: customer?.defaultPrice || 0,
    qty05l: 0,
    price05l: 0,
    qty15l: 0,
    price15l: 0,
    expectedDelivery: today,
    paymentStatus: 'UNPAID',
    remarks: '',
  });

  useEffect(() => {
    fetch(`${API}/items?type=FINISHED_GOOD`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.data); });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSubmit(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const item19l = items.find(i => i.name?.toLowerCase().includes('19l') || i.name?.toLowerCase().includes('19 l'));
  const item05l = items.find(i => i.name?.toLowerCase().includes('500') || i.name?.toLowerCase().includes('0.5'));
  const item15l = items.find(i => i.name?.toLowerCase().includes('1.5') || i.name?.toLowerCase().includes('1500'));

  const total = orderType === 'NINETEEN_L'
    ? (parseFloat(form.qty19l) || 0) * (parseFloat(form.price19l) || 0)
    : (parseFloat(form.qty05l) || 0) * (parseFloat(form.price05l) || 0)
      + (parseFloat(form.qty15l) || 0) * (parseFloat(form.price15l) || 0);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (bypass = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      let orderItems = [];
      if (orderType === 'NINETEEN_L' && item19l) {
        orderItems = [{ itemId: item19l.id, quantity: parseInt(form.qty19l), price: parseFloat(form.price19l) }];
      } else {
        if (parseInt(form.qty05l) > 0 && item05l)
          orderItems.push({ itemId: item05l.id, quantity: parseInt(form.qty05l), price: parseFloat(form.price05l) });
        if (parseInt(form.qty15l) > 0 && item15l)
          orderItems.push({ itemId: item15l.id, quantity: parseInt(form.qty15l), price: parseFloat(form.price15l) });
      }
      if (orderItems.length === 0) { alert('Please enter at least one item quantity.'); setIsSubmitting(false); return; }

      const res = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerId: customer.id,
          type: orderType,
          items: orderItems,
          expectedDelivery: form.expectedDelivery,
          remarks: form.remarks,
          paymentStatus: form.paymentStatus,
          bypassCreditCheck: bypass,
        }),
      });
      const json = await res.json();
      if (json.softBlock) { setSoftBlockData(json); return; }
      if (json.success) { onOrderPlaced(); }
      else alert(json.message || 'Failed to create order');
    } catch (e) { alert('Network error'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-800">New Order</h3>
            <p className="text-sm text-slate-500">{customer?.name} • Bal: <span className={customer?.cachedBalance > 0 ? 'text-red-500 font-semibold' : 'text-emerald-600 font-semibold'}>Rs.{customer?.cachedBalance || 0}</span></p>
          </div>
          <button onClick={onClose} className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Step 1: Order type */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Select Order Type</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setOrderType('NINETEEN_L'); setStep(2); }}
                className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all ${orderType === 'NINETEEN_L' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'}`}
              >
                <Droplets size={28} className={orderType === 'NINETEEN_L' ? 'text-blue-600' : 'text-slate-400'} />
                <span className="font-bold text-slate-700">19L Water</span>
                {orderType === 'NINETEEN_L' && <CheckCircle size={16} className="text-blue-600" />}
              </button>
              <button
                type="button"
                onClick={() => { setOrderType('PET'); setStep(2); }}
                className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all ${orderType === 'PET' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'}`}
              >
                <Package size={28} className={orderType === 'PET' ? 'text-emerald-600' : 'text-slate-400'} />
                <span className="font-bold text-slate-700">PET Bottles</span>
                {orderType === 'PET' && <CheckCircle size={16} className="text-emerald-600" />}
              </button>
            </div>
          </div>

          {/* Step 2: Details */}
          {step === 2 && orderType && (
            <div className="space-y-4 border-t border-slate-100 pt-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Order Details</h4>

              {orderType === 'NINETEEN_L' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label>
                    <input type="number" min="1" value={form.qty19l} onChange={e => set('qty19l', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-lg font-bold" autoFocus />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Price/Bottle (Rs)</label>
                    <input type="number" step="0.5" min="0" value={form.price19l} onChange={e => set('price19l', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">0.5L Packs Qty</label>
                      <input type="number" min="0" value={form.qty05l} onChange={e => set('qty05l', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" autoFocus />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">0.5L Price/Pack (Rs)</label>
                      <input type="number" step="0.5" min="0" value={form.price05l} onChange={e => set('price05l', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">1.5L Packs Qty</label>
                      <input type="number" min="0" value={form.qty15l} onChange={e => set('qty15l', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">1.5L Price/Pack (Rs)</label>
                      <input type="number" step="0.5" min="0" value={form.price15l} onChange={e => set('price15l', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                    </div>
                  </div>
                </div>
              )}

              {/* Live total */}
              <div className={`rounded-xl p-3 flex justify-between items-center ${orderType === 'NINETEEN_L' ? 'bg-blue-50 border border-blue-100' : 'bg-emerald-50 border border-emerald-100'}`}>
                <span className="text-sm font-medium text-slate-600">Order Total</span>
                <span className={`text-xl font-bold ${orderType === 'NINETEEN_L' ? 'text-blue-800' : 'text-emerald-800'}`}>Rs. {total.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery</label>
                  <input type="date" value={form.expectedDelivery} onChange={e => set('expectedDelivery', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Status</label>
                  <select value={form.paymentStatus} onChange={e => set('paymentStatus', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none">
                    <option value="UNPAID">Unpaid (COD)</option>
                    <option value="PAID">Paid in Advance</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea rows={2} value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Driver notes, special instructions..."
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 2 && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-white rounded-b-2xl">
            <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
            <button onClick={() => handleSubmit(false)} disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50">
              {isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              Place Order <span className="text-xs opacity-75 font-normal">(Ctrl+Enter)</span>
            </button>
          </div>
        )}

        {/* Credit soft-block overlay */}
        {softBlockData && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-20 rounded-2xl">
            <div className="bg-white border border-amber-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={26} />
              </div>
              <h4 className="text-lg font-bold text-slate-800">Credit Limit Warning</h4>
              <p className="text-sm text-slate-600 bg-amber-50 border border-amber-100 p-3 rounded-xl leading-relaxed">
                {softBlockData.message}
              </p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setSoftBlockData(null)}
                  className="flex-1 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={() => { setSoftBlockData(null); handleSubmit(true); }}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors">
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
