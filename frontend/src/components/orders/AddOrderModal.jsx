import { useState, useRef, useEffect } from 'react';
import { X, User, Package, Calendar, AlertTriangle, Search, ChevronDown, CheckCircle2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';
import { getTenantCatalog } from '../../constants/wadaanaProducts';
import { getCompanyFromCookie } from '../../utils/companyCookie';

export default function AddOrderModal({ onClose, onOrderAdded, customers = [], items = [] }) {
  const activeTenant = getCompanyFromCookie() || localStorage.getItem('tenant') || 'aquasphere';
  const isWadaana = activeTenant === 'wadaana';

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

  const [asyncCustomers, setAsyncCustomers] = useState(customers);

  useEffect(() => {
    if (customers && customers.length > 0) {
      setAsyncCustomers(customers);
    }
  }, [customers]);

  useEffect(() => {
    if (!searchTerm.trim()) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/customers?search=${encodeURIComponent(searchTerm)}`, { credentials: 'include' });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setAsyncCustomers(prev => {
            const map = new Map(prev.map(c => [c.id, c]));
            json.data.forEach(c => map.set(c.id, c));
            return Array.from(map.values());
          });
        }
      } catch (err) {
        console.error('Error searching customers:', err);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const selectedCustomer = asyncCustomers.find(c => c.id === orderData.customerId) || customers.find(c => c.id === orderData.customerId);

  // Merge DB items with tenant catalog using Map for strict deduplication
  const catalog = getTenantCatalog(activeTenant, selectedCustomer);
  const itemMap = new Map();

  catalog.forEach(catItem => {
    const normKey = catItem.name.toLowerCase().trim();
    if (!itemMap.has(normKey)) {
      const dbMatch = items.find(i => i.name.toLowerCase().trim() === normKey);
      itemMap.set(normKey, {
        id: catItem.id,
        dbItemId: dbMatch?.id || null,
        name: catItem.name,
        category: catItem.category,
        categoryLabel: catItem.categoryLabel,
        defaultPrice: catItem.defaultPrice,
        unit: catItem.unit,
        isCustomerPreference: catItem.isCustomerPreference
      });
    }
  });

  const availableItems = Array.from(itemMap.values());

  // Group items by category label
  const categories = Array.from(new Set(availableItems.map(i => i.categoryLabel)));

  const filteredCustomers = asyncCustomers.filter(c => 
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

  // Pre-select items preferred by selected customer
  useEffect(() => {
    if (selectedCustomer) {
      const initialSelected = {};
      availableItems.forEach(item => {
        if (item.isCustomerPreference) {
          initialSelected[item.id] = { quantity: 1 };
        }
      });
      setSelectedItems(initialSelected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderData.customerId]);

  const orderTotal = Object.entries(selectedItems).reduce((sum, [itemId, data]) => {
    const item = availableItems.find(i => i.id === itemId);
    if (!item) return sum;
    const price = Math.round(item.defaultPrice);
    return sum + (price * (parseInt(data.quantity) || 0));
  }, 0);

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
      toast.error('Please select a customer first');
      return;
    }
    const selectedKeys = Object.keys(selectedItems).filter(k => selectedItems[k].quantity > 0);
    if (selectedKeys.length === 0) {
      toast.error('Please select at least one item with a valid quantity');
      return;
    }
    
    setIsSubmitting(true);
    
    const has19L = selectedKeys.some(itemId => {
      const item = availableItems.find(i => i.id === itemId);
      return item?.category === '19L';
    });
    const hasMix = selectedKeys.some(itemId => {
      const item = availableItems.find(i => i.id === itemId);
      return item?.category === 'MIX';
    });
    const orderType = isWadaana ? (hasMix ? 'MIX_BOTTLES' : 'PURE_BOTTLES') : (has19L ? 'NINETEEN_L' : 'PET');

    const orderItemsPayload = selectedKeys.map(itemId => {
      const item = availableItems.find(i => i.id === itemId);
      const price = Math.round(item.defaultPrice);
      return {
        itemId: item.dbItemId || item.id,
        catalogId: item.id,
        productName: item.name,
        quantity: selectedItems[itemId].quantity,
        price
      };
    });

    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant': activeTenant
        },
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
        toast.success('Order placed successfully.');
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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl relative border border-slate-100">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center z-10">
          <div>
            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${isWadaana ? 'bg-sky-50 text-[#0ea5e9] border-sky-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
              {isWadaana ? 'WADAANA PREFORM ORDERS' : 'AQUASPHERE DISPATCH'}
            </span>
            <h3 className="text-xl font-bold text-slate-800 mt-0.5">Create New Order</h3>
          </div>
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
          className="p-6 space-y-6"
        >
          {/* Customer Selection Section */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <User size={15}/> Customer Information
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 relative" ref={dropdownRef}>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Select Customer *</label>
                <div 
                  className={`w-full border rounded-xl p-3 bg-white cursor-pointer flex justify-between items-center transition-all ${dropdownOpen ? 'border-sky-500 ring-2 ring-sky-500/10' : 'border-slate-200'}`}
                  onClick={() => setDropdownOpen(true)}
                >
                  <div className="flex-1 truncate">
                    {selectedCustomer ? (
                      <span className="text-slate-800 font-bold">{selectedCustomer.name} <span className="text-slate-500 font-normal text-sm">({selectedCustomer.phone})</span></span>
                    ) : (
                      <span className="text-slate-400 text-sm">Search and select customer...</span>
                    )}
                  </div>
                  <ChevronDown size={18} className="text-slate-400 ml-2" />
                </div>

                {dropdownOpen && (
                  <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 flex flex-col overflow-hidden animate-in fade-in duration-150">
                    <div className="p-3 border-b border-slate-100 flex items-center gap-2 sticky top-0 bg-white">
                      <Search size={16} className="text-slate-400" />
                      <input 
                        type="text"
                        autoFocus
                        placeholder="Type name or phone to search..."
                        className="w-full outline-none text-sm font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-1">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-400">No customers found</div>
                      ) : (
                        filteredCustomers.map(c => (
                          <div 
                            key={c.id} 
                            className={`p-3 rounded-lg cursor-pointer hover:bg-slate-50 flex justify-between items-center ${c.id === orderData.customerId ? 'bg-sky-50 border border-sky-200' : 'border border-transparent'}`}
                            onClick={() => {
                              setOrderData(prev => ({ ...prev, customerId: c.id }));
                              setDropdownOpen(false);
                              setSearchTerm('');
                            }}
                          >
                            <div>
                              <div className="font-bold text-slate-800 text-sm">{c.name}</div>
                              <div className="text-xs text-slate-500">{c.phone} &bull; {c.type}</div>
                            </div>
                            <div className="text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-md">Select</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {selectedCustomer && (
                <div className="md:col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <div className="text-sm font-bold text-slate-800">{selectedCustomer.name}</div>
                    <div className="text-xs text-slate-500">{selectedCustomer.address || 'No address specified'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Financial Status</div>
                    <div className={`font-black text-base ${parseFloat(selectedCustomer.currentBalance || 0) > parseFloat(selectedCustomer.creditLimit || 0) ? 'text-red-600' : (parseFloat(selectedCustomer.currentBalance || 0) > 0 ? 'text-amber-600' : 'text-emerald-600')}`}>
                      Debt: Rs. {parseFloat(selectedCustomer.currentBalance || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold">
                      (Credit Limit: Rs. {parseFloat(selectedCustomer.creditLimit || 0).toLocaleString()})
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product Items Catalog Hierarchy Section */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Package size={15}/> Order Items ({isWadaana ? 'Wadaana Preforms' : 'AquaSphere'})
              </h4>
              {selectedCustomer && (
                <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <Star size={11} className="fill-amber-500 text-amber-500" /> Customer Preferred Items Highlighted
                </span>
              )}
            </div>

            <div className="space-y-4">
              {categories.map(catLabel => {
                const catItems = availableItems.filter(i => i.categoryLabel === catLabel);
                return (
                  <div key={catLabel} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${catLabel.includes('PURE') ? 'bg-[#0ea5e9]' : catLabel.includes('MIX') ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                      {catLabel}
                    </div>

                    <div className="space-y-2.5">
                      {catItems.map(item => {
                        const isSelected = !!selectedItems[item.id];

                        return (
                          <div 
                            key={item.id} 
                            className={`p-3 rounded-xl border transition-all ${
                              isSelected 
                                ? 'bg-white border-sky-400 shadow-xs ring-1 ring-sky-400/20' 
                                : 'bg-white/60 border-slate-200 hover:bg-white'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <label className="flex items-center gap-3 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleItemToggle(item.id, item.defaultPrice)}
                                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                                />
                                <div>
                                  <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    {item.name}
                                    {item.isCustomerPreference && (
                                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                                        <Star size={10} className="fill-amber-500 text-amber-500" /> Customer Preference
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-slate-400">Default Rate: Rs. {item.defaultPrice} / {item.unit}</span>
                                </div>
                              </label>

                              {isSelected && (
                                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Quantity</span>
                                    <input
                                      type="number"
                                      step="1"
                                      min="1"
                                      value={selectedItems[item.id]?.quantity || 1}
                                      onChange={(e) => handleItemQuantityChange(item.id, e.target.value)}
                                      className="w-24 border border-slate-200 bg-white rounded-lg p-1.5 text-sm font-bold text-slate-800 outline-none focus:border-sky-500"
                                      required
                                    />
                                  </div>

                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Fixed Rate</span>
                                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-black px-3 py-1.5 rounded-lg">
                                      Rs. {Math.round(item.defaultPrice)}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 bg-sky-50 border border-sky-200 rounded-xl p-4 flex justify-between items-center">
              <span className="text-sm text-sky-800 font-extrabold uppercase tracking-wider">Estimated Order Total</span>
              <span className="text-2xl font-black text-sky-950">Rs. {Number(orderTotal).toLocaleString()}</span>
            </div>
          </div>

          {/* Logistics & Payment */}
          <div className="border-t border-slate-100 pt-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Calendar size={15}/> Logistics & Settlement
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expected Delivery Date</label>
                <input name="expectedDelivery" type="date" className="w-full border border-slate-200 rounded-xl p-3 focus:border-sky-500 outline-none font-medium" value={orderData.expectedDelivery} onChange={handleChange} />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Payment Status</label>
                <select name="paymentStatus" className="w-full border border-slate-200 rounded-xl p-3 focus:border-sky-500 outline-none font-medium" value={orderData.paymentStatus} onChange={handleChange}>
                  <option value="UNPAID">Unpaid (Cash on Delivery / Credit)</option>
                  <option value="PAID">Paid in Advance</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Internal Remarks / Driver Notes</label>
                <textarea name="remarks" rows="2" placeholder="E.g., preform delivery to factory floor..." className="w-full border border-slate-200 rounded-xl p-3 focus:border-sky-500 outline-none resize-none font-medium" value={orderData.remarks} onChange={handleChange}></textarea>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="btn-secondary text-xs py-2 px-4">Cancel</button>
            <button 
              type="submit" 
              disabled={isSubmitting || !orderData.customerId} 
              className="btn-primary text-xs py-2 px-5 flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={15}/>
              {isSubmitting ? 'Processing...' : 'Confirm & Place Order'}
            </button>
          </div>
        </form>

        {/* Soft-Block Warning Modal Overlay */}
        {softBlockData && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-60">
            <div className="bg-white border border-amber-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={28} />
              </div>
              <h4 className="text-lg font-bold text-slate-800">
                {softBlockData.blockReason === 'UNUSUAL_QUANTITY' ? 'Unusual Quantity Alert' : 
                 softBlockData.blockReason === 'BOTTLE_SECURITY_EXCEEDED' ? 'Bottle Security Warning' : 
                 'Credit Limit Soft-Block'}
              </h4>
              <p className="text-xs text-slate-600 bg-amber-50 border border-amber-100 p-3 rounded-xl font-medium">
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
