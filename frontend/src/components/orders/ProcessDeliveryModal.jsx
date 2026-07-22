import { useState } from 'react';
import { X, Truck, CheckCircle, Package, DollarSign, AlertTriangle } from 'lucide-react';

export default function ProcessDeliveryModal({ order, onClose, onDeliveryProcessed }) {
  const [deliveryData, setDeliveryData] = useState({
    qtyDelivered: order.items[0]?.quantity || 0,
    bottlesReturnedGood: 0,
    bottlesReturnedBroken: 0,
    cashReceived: order.paymentStatus === 'PAID' ? 0 : (order.items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0)),
    paymentMethod: 'CASH',
    remarks: ''
  });

  const [softBlockMsg, setSoftBlockMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => setDeliveryData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const submitDelivery = async (e, bypassBottleCheck = false) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/orders/${order.id}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...deliveryData, bypassBottleCheck }),
        credentials: 'include'
      });

      const json = await res.json();

      if (!res.ok && json.message && json.message.includes('SOFT_BLOCK_BOTTLES')) {
        setSoftBlockMsg(json.message.replace('SOFT_BLOCK_BOTTLES: ', ''));
        setIsSubmitting(false);
        return;
      }

      if (json.success) {
        onDeliveryProcessed();
      } else {
        alert(json.message || 'Failed to process delivery');
      }
    } catch (err) {
      console.error(err);
      alert('Error processing delivery');
    } finally {
      setIsSubmitting(false);
    }
  };

  const orderTotal = order.items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl relative">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
              <Truck size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Process Delivery</h3>
              <div className="text-sm text-slate-500">Order: ORD-{order.id.substring(0,6).toUpperCase()} • {order.customer?.name}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={(e) => submitDelivery(e, false)} className="p-6 space-y-8">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
             <div className="flex flex-col">
               <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Ordered Qty</span>
               <span className="text-lg font-bold text-slate-800">{totalItems} Units</span>
             </div>
             <div className="flex flex-col">
               <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Total Value</span>
               <span className="text-lg font-bold text-slate-800">Rs. {orderTotal}</span>
             </div>
             <div className="flex flex-col">
               <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Payment Status</span>
               <span className={`text-sm font-bold mt-1 px-2 py-0.5 rounded-full w-max ${order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                 {order.paymentStatus}
               </span>
             </div>
             <div className="flex flex-col">
               <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Cust. Balance</span>
               <span className={`text-lg font-bold ${order.customer?.cachedBalance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                 Rs. {order.customer?.cachedBalance || 0}
               </span>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
            
            <div className="space-y-4">
               <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Package size={16}/> Delivery & Bottles</h4>
               
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Quantity Delivered *</label>
                 <input name="qtyDelivered" type="number" min="0" className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none" value={deliveryData.qtyDelivered} onChange={handleChange} required />
               </div>
               
               {order.type === 'NINETEEN_L' && (
                 <>
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Empty Bottles Returned (Good)</label>
                     <input name="bottlesReturnedGood" type="number" min="0" className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none" value={deliveryData.bottlesReturnedGood} onChange={handleChange} />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Empty Bottles Returned (Broken)</label>
                     <input name="bottlesReturnedBroken" type="number" min="0" className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none" value={deliveryData.bottlesReturnedBroken} onChange={handleChange} />
                   </div>
                 </>
               )}
            </div>

            <div className="space-y-4">
               <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2"><DollarSign size={16}/> Settlement</h4>
               
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Cash Received (Rs) *</label>
                 <input name="cashReceived" type="number" step="0.01" min="0" className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none font-bold text-slate-800" value={deliveryData.cashReceived} onChange={handleChange} required />
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                 <select name="paymentMethod" className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none" value={deliveryData.paymentMethod} onChange={handleChange}>
                   <option value="CASH">Cash</option>
                   <option value="BANK_TRANSFER">Bank Transfer / Online</option>
                   <option value="CHEQUE">Cheque</option>
                 </select>
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Remarks</label>
                 <textarea name="remarks" rows="2" className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none resize-none" value={deliveryData.remarks} onChange={handleChange}></textarea>
               </div>
            </div>

          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="px-6 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50">
              <CheckCircle size={18}/> {isSubmitting ? 'Processing...' : 'Mark as Delivered'}
            </button>
          </div>
        </form>

        {/* Soft-Block Warning Modal Overlay */}
        {softBlockMsg && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-20 rounded-2xl">
            <div className="bg-white border border-amber-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={28} />
              </div>
              <h4 className="text-lg font-bold text-slate-800">Bottle Return Warning</h4>
              <p className="text-xs text-slate-600 bg-amber-50 border border-amber-100 p-3 rounded-xl">
                {softBlockMsg}
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSoftBlockMsg(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  Adjust Bottle Counts
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSoftBlockMsg(null);
                    submitDelivery(null, true);
                  }}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs"
                >
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
