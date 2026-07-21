import { useState } from 'react';
import { X, Truck, CheckCircle, Package, DollarSign } from 'lucide-react';

export default function ProcessDeliveryModal({ order, onClose, onDeliveryProcessed }) {
  const [deliveryData, setDeliveryData] = useState({
    qtyDelivered: order.items[0]?.quantity || 0,
    bottlesReturnedGood: 0,
    bottlesReturnedBroken: 0,
    cashReceived: order.paymentStatus === 'PAID' ? 0 : (order.items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0)),
    paymentMethod: 'CASH',
    remarks: ''
  });

  const handleChange = (e) => setDeliveryData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const submitDelivery = async (e) => {
    e.preventDefault();
    await fetch(`${import.meta.env.VITE_API_URL}/orders/${order.id}/deliver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deliveryData),
      credentials: 'include'
    });
    onDeliveryProcessed();
  };

  const orderTotal = order.items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
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
        
        <form onSubmit={submitDelivery} className="p-6 space-y-8">
          
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
            <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2">
              <CheckCircle size={18}/> Mark as Delivered
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
