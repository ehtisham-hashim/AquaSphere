import { useState, useRef, useEffect } from 'react';
import { X, User, Package, Calendar, AlertTriangle, Search, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';

export default function AddOrderModal({ onClose, onOrderAdded, customers, items }) {
  const todayDate = new Date().toISOString().split('T')[0];
  const [orderData, setOrderData] = useState({
    customerId: '', 
    expectedDelivery: todayDate, 
    paymentStatus: 'UNPAID',
    remarks: ''
  });

  const [selectedItems, setSelectedItems] = useState({});
  const [softBlockData, setSoftBlockData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combobox state
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedCustomer = customers.find(c => c.id === orderData.customerId);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone && c.phone.includes(searchTerm))
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPrice = (item, customer) => {
    const name = item.name.toLowerCase();
    if (name.includes('19l')) return parseFloat(customer?.defaultPrice || 0) || 150;
    if (name.includes('500ml') || name.includes('0.5l')) return 250;
    if (name.includes('1500ml') || name.includes('1.5l')) return 300;
    return 100;
  };

  const getCleanName = (item) => {
    const name = item.name.toLowerCase();
    if (name.includes('500ml') || name.includes('0.5l')) return '0.5L Pack (12 bottles)';
    if (name.includes('1500ml') || name.includes('1.5l')) return '1.5L Pack (6 bottles)';
    if (name.includes('19l')) return '19L Refill';
    return item.name;
  };

  const orderTotal = Object.entries(selectedItems).reduce((sum, [itemId, data]) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return sum;
    const price = getPrice(item, selectedCustomer);
    return sum + (price * data.quantity);
  }, 0).toFixed(2);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setOrderData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemToggle = (itemId) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      if (next[itemId]) {
        delete next[itemId];
      } else {
        next[itemId] = { quantity: 1 };
      }
      return next;
    });
  };

  const handleItemQuantityChange = (itemId, qty) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: { quantity: parseInt(qty) || 0 }
    }));
  };

  const submitOrder = async (e, bypassCreditCheck = false) => {
    if (e) e.preventDefault();
    if (!orderData.customerId) {
      toast.error('Please select a customer');
      return;
    }
    if (Object.keys(selectedItems).length === 0) {
      toast.error('Please select at least one item');
      return;
    }
    
    setIsSubmitting(true);
    
    const has19L = Object.keys(selectedItems).some(itemId => {
      const item = items.find(i => i.id === itemId);
      return item?.name.toLowerCase().includes('19l');
    });
    const orderType = has19L ? 'NINETEEN_L' : 'PET';

    const orderItemsPayload = Object.entries(selectedItems).map(([itemId, data]) => {
      const item = items.find(i => i.id === itemId);
      return {
        itemId,
        quantity: data.quantity,
        price: getPrice(item, selectedCustomer)
      };
    }).filter(i => i.quantity > 0);

    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customerId: orderData.customerId, 
          type: orderType, 
          expectedDelivery: orderData.expectedDelivery, 
          remarks: orderData.remarks,
          paymentStatus: orderData.paymentStatus,
          bypassCreditCheck,
          items: orderItemsPayload
        }),
        credentials: 'include'
      });

      const json = await res.json();

      if (json.softBlock) {
        setSoftBlockData(json);
        setIsSubmitting(false);
        return;
      }

      if (json.success) {
        toast.success('✅ Order placed successfully.');
        onOrderAdded();
      } else {
        toast.error(json.message || 'Failed to create order');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error creating order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl relative">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center z-10">
          <h3 className="text-xl font-bold text-slate-800">Create New Order</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form 
          onSubmit={(e) => submitOrder(e, false)} 
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              submitOrder(e, false);
            }
          }}
          className="p-6 space-y-8"
        >
          {/* Customer Selection Section */}
          <div>
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><User size={16}/> Customer Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 relative" ref={dropdownRef}>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Customer *</label>
                <div 
                  className="w-full border border-slate-200 rounded-xl p-3 focus-within:border-blue-500 bg-white cursor-pointer flex justify-between items-center"
                  onClick={() => setDropdownOpen(true)}
                >
                  <div className="flex-1 truncate">
                    {selectedCustomer ? (
                      <span className="text-slate-800 font-medium">{selectedCustomer.name} <span className="text-slate-500 text-sm">({selectedCustomer.phone})</span></span>
                    ) : (
                      <span className="text-slate-400">Search and select customer...</span>
                    )}
                  </div>
                  <ChevronDown size={18} className="text-slate-400 ml-2" />
                </div>

                {dropdownOpen && (
                  <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-slate-100 flex items-center gap-2 sticky top-0 bg-white">
                      <Search size={16} className="text-slate-400" />
                      <input 
                        type="text"
                        autoFocus
                        placeholder="Type name or phone to search..."
                        className="w-full outline-none text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="overflow-y-auto flex-1 p-2">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-3 text-center text-sm text-slate-500">No customers found</div>
                      ) : (
                        filteredCustomers.map(c => (
                          <div 
                            key={c.id} 
                            className={`p-3 rounded-lg cursor-pointer hover:bg-slate-50 flex justify-between items-center ${c.id === orderData.customerId ? 'bg-blue-50 border border-blue-100' : 'border border-transparent'}`}
                            onClick={() => {
                              setOrderData(prev => ({ ...prev, customerId: c.id }));
                              setDropdownOpen(false);
                              setSearchTerm('');
                            }}
                          >
                            <div>
                              <div className="font-semibold text-slate-800">{c.name}</div>
                              <div className="text-xs text-slate-500">{c.phone} &bull; {c.type}</div>
                            </div>
                            <div className="text-xs font-medium text-slate-400">Select</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {selectedCustomer && (
                <div className="md:col-span-2 bg-slate-50 border border-slate-100 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{selectedCustomer.name}</div>
                    <div className="text-xs text-slate-500">{selectedCustomer.address}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 uppercase tracking-wide">Financial Status</div>
                    <div className={`font-bold ${parseFloat(selectedCustomer.currentBalance || 0) > parseFloat(selectedCustomer.creditLimit || 0) ? 'text-red-500' : (parseFloat(selectedCustomer.currentBalance || 0) > 0 ? 'text-amber-500' : 'text-emerald-500')}`}>
                      Debt: Rs. {parseFloat(selectedCustomer.currentBalance || 0)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      (Limit: Rs. {selectedCustomer.creditLimit || 0})
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product Details Section */}
          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Package size={16}/> Order Items</h4>
            
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {items.map(item => {
                const isSelected = !!selectedItems[item.id];
                const price = getPrice(item, selectedCustomer);
                return (
                  <div key={item.id} className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleItemToggle(item.id)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <span>{getCleanName(item)}</span>
                      <span className="text-slate-400 font-normal ml-1">(Rs. {price})</span>
                    </label>
                    {isSelected && (
                      <input
                        type="number"
                        min="1"
                        value={selectedItems[item.id].quantity || ''}
                        onChange={(e) => handleItemQuantityChange(item.id, e.target.value)}
                        placeholder="Qty"
                        className="w-24 border border-slate-200 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                        required
                      />
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 flex justify-between items-center">
              <div className="text-sm text-blue-600 font-bold uppercase">Estimated Total</div>
              <div className="text-2xl font-bold text-blue-900">Rs. {orderTotal}</div>
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
            <button type="submit" disabled={isSubmitting} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-sm disabled:opacity-50">
              {isSubmitting ? 'Processing...' : 'Confirm & Place Order'}
            </button>
          </div>
        </form>

        {/* Soft-Block Warning Modal Overlay */}
        {softBlockData && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-20 rounded-2xl">
            <div className="bg-white border border-amber-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={28} />
              </div>
              <h4 className="text-lg font-bold text-slate-800">
                {softBlockData.blockReason === 'UNUSUAL_QUANTITY' ? 'Unusual Quantity Alert' : 
                 softBlockData.blockReason === 'BOTTLE_SECURITY_EXCEEDED' ? 'Bottle Security Warning' : 
                 'Credit Limit Soft-Block'}
              </h4>
              <p className="text-xs text-slate-600 bg-amber-50 border border-amber-100 p-3 rounded-xl">
                {softBlockData.message}
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSoftBlockData(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  Cancel / Re-adjust Order
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSoftBlockData(null);
                    submitOrder(null, true);
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
