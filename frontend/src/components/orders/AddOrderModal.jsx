import { useState, useEffect } from 'react';
import { X, DollarSign, User, Package, Calendar } from 'lucide-react';

export default function AddOrderModal({ onClose, onOrderAdded, customers, items }) {
  const [orderData, setOrderData] = useState({
    customerId: '', 
    type: 'NINETEEN_L', 
    itemId: '', 
    quantity: '', 
    price: '', 
    expectedDelivery: '', 
    paymentStatus: 'UNPAID',
    remarks: ''
  });

  const selectedCustomer = customers.find(c => c.id === orderData.customerId);
  const selectedItem = items.find(i => i.id === orderData.itemId);
  
  const orderTotal = (orderData.quantity && orderData.price) 
    ? (parseFloat(orderData.quantity) * parseFloat(orderData.price)).toFixed(2) 
    : '0.00';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setOrderData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'customerId' && value) {
       const cust = customers.find(c => c.id === value);
       if(cust && cust.defaultPrice > 0) {
         setOrderData(prev => ({ ...prev, price: cust.defaultPrice }));
       }
    }
  };

  const submitOrder = async (e) => {
    e.preventDefault();
    
    // Auto-derive type from selected item name
    const item = items.find(i => i.id === orderData.itemId);
    const orderType = (item?.name || '').toLowerCase().includes('19l') ? 'NINETEEN_L' : 'PET';

    await fetch('http://localhost:3000/api/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        customerId: orderData.customerId, 
        type: orderType, 
        expectedDelivery: orderData.expectedDelivery, 
        remarks: orderData.remarks,
        paymentStatus: orderData.paymentStatus,
        items: [{ itemId: orderData.itemId, quantity: orderData.quantity, price: orderData.price }] 
      }),
      credentials: 'include'
    });
    onOrderAdded();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center z-10">
          <h3 className="text-xl font-bold text-slate-800">Create New Order</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={submitOrder} className="p-6 space-y-8">
          {/* Customer Selection Section */}
          <div>
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><User size={16}/> Customer Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Customer *</label>
                <select name="customerId" className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none" value={orderData.customerId} onChange={handleChange} required>
                  <option value="">Search and select customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone}) - {c.type}</option>)}
                </select>
              </div>
              
              {selectedCustomer && (
                <div className="md:col-span-2 bg-slate-50 border border-slate-100 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{selectedCustomer.name}</div>
                    <div className="text-xs text-slate-500">{selectedCustomer.address}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 uppercase tracking-wide">Current Balance</div>
                    <div className={`font-bold ${selectedCustomer.cachedBalance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      Rs. {selectedCustomer.cachedBalance}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product Details Section */}
          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Package size={16}/> Order Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Item *</label>
                <select name="itemId" className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none" value={orderData.itemId} onChange={handleChange} required>
                  <option value="">Search or select item...</option>
                  {items.map(i => {
                    const cleanName = i.name.toLowerCase().includes('500ml') ? '0.5L Bottles' : 
                                      i.name.toLowerCase().includes('19l') ? '19L Refill' : i.name;
                    return <option key={i.id} value={i.id}>{cleanName}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label>
                <input name="quantity" type="number" min="1" className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none" value={orderData.quantity} onChange={handleChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unit Price (Rs) *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                  <input name="price" type="number" step="0.01" min="0" className="w-full border border-slate-200 rounded-xl py-3 pl-9 pr-3 focus:border-blue-500 outline-none" value={orderData.price} onChange={handleChange} required />
                </div>
              </div>
              <div className="lg:col-span-2 bg-blue-50 border border-blue-100 rounded-xl p-3 flex flex-col justify-center items-end">
                <div className="text-xs text-blue-600 font-medium uppercase">Estimated Total</div>
                <div className="text-xl font-bold text-blue-900">Rs. {orderTotal}</div>
              </div>
            </div>
          </div>

          {/* Logistics & Payment */}
          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Calendar size={16}/> Logistics & Settlement</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery Date</label>
                <input name="expectedDelivery" type="date" className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none" value={orderData.expectedDelivery} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Initial Payment Status</label>
                <select name="paymentStatus" className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none" value={orderData.paymentStatus} onChange={handleChange}>
                  <option value="UNPAID">Unpaid (Cash on Delivery)</option>
                  <option value="PAID">Paid in Advance</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Internal Remarks / Driver Notes</label>
                <textarea name="remarks" rows="2" placeholder="E.g., call before arriving, deliver to back door..." className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none resize-none" value={orderData.remarks} onChange={handleChange}></textarea>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="px-6 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
            <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-sm">Confirm & Place Order</button>
          </div>
        </form>
      </div>
    </div>
  );
}
