import { useState } from 'react';
import { X, Package, Calendar, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';
import { getTenantCatalog } from '../../constants/wadaanaProducts';
import { getCompanyFromCookie } from '../../utils/companyCookie';

export default function EditOrderModal({ order, onClose, onOrderEdited, items = [] }) {
  const activeTenant = getCompanyFromCookie() || localStorage.getItem('tenant') || 'aquasphere';
  const isWadaana = activeTenant === 'wadaana';

  const [editData, setEditData] = useState({
    expectedDelivery: order.expectedDelivery ? new Date(order.expectedDelivery).toISOString().split('T')[0] : '',
    remarks: order.remarks || ''
  });

  const selectedCustomer = order.customer;
  const catalog = getTenantCatalog(activeTenant, selectedCustomer);

  // Build unified deduplicated item list
  const itemMap = new Map();
  catalog.forEach(catItem => {
    const normKey = catItem.name.toLowerCase().trim();
    if (!itemMap.has(normKey)) {
      const dbMatch = items.find(i => i.name?.toLowerCase().trim() === normKey);
      const dbPrice = dbMatch ? Number(dbMatch.retailPrice || 0) : 0;
      itemMap.set(normKey, {
        id: catItem.id,
        dbItemId: dbMatch?.id || null,
        name: catItem.name,
        category: catItem.category,
        categoryLabel: catItem.categoryLabel,
        defaultPrice: dbPrice > 0 ? dbPrice : Math.round(catItem.defaultPrice),
        unit: catItem.unit
      });
    }
  });

  // Also include any active finished goods from DB not in static catalog
  items.forEach(dbItem => {
    if (dbItem.type === 'FINISHED_GOOD' || !dbItem.type) {
      const normKey = (dbItem.name || '').toLowerCase().trim();
      if (normKey && !itemMap.has(normKey)) {
        itemMap.set(normKey, {
          id: dbItem.id,
          dbItemId: dbItem.id,
          name: dbItem.name,
          category: 'FINISHED_GOOD',
          categoryLabel: 'OTHER FINISHED GOODS',
          defaultPrice: Number(dbItem.retailPrice || 0),
          unit: dbItem.unit || 'units'
        });
      }
    }
  });

  const availableItems = Array.from(itemMap.values());
  const categories = Array.from(new Set(availableItems.map(i => i.categoryLabel)));

  // Initialize selected items from existing order.items
  const [selectedItems, setSelectedItems] = useState(() => {
    const initialItems = {};
    if (order.items && order.items.length > 0) {
      order.items.forEach(oi => {
        const itemObj = oi.item;
        const normName = itemObj?.name?.toLowerCase().trim();
        // find matching catalog item
        const match = availableItems.find(ai => 
          ai.name.toLowerCase().trim() === normName || 
          ai.id === oi.itemId || 
          ai.dbItemId === oi.itemId
        );
        const targetId = match ? match.id : oi.itemId;
        initialItems[targetId] = { quantity: oi.quantity, dbItemId: oi.itemId };
      });
    }
    return initialItems;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const orderTotal = Object.entries(selectedItems).reduce((sum, [itemId, data]) => {
    const item = availableItems.find(i => i.id === itemId);
    const price = item ? item.defaultPrice : 0;
    return sum + (price * (parseInt(data.quantity) || 0));
  }, 0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemToggle = (itemId) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      if (next[itemId] && next[itemId].quantity > 0) {
        delete next[itemId];
      } else {
        const existingDbId = availableItems.find(i => i.id === itemId)?.dbItemId || itemId;
        next[itemId] = { quantity: 1, dbItemId: existingDbId };
      }
      return next;
    });
  };

  const handleItemQuantityChange = (itemId, valStr) => {
    const parsed = parseInt(valStr, 10);
    setSelectedItems(prev => {
      const next = { ...prev };
      if (isNaN(parsed) || parsed <= 0) {
        delete next[itemId];
      } else {
        const existingDbId = prev[itemId]?.dbItemId || availableItems.find(i => i.id === itemId)?.dbItemId || itemId;
        next[itemId] = { quantity: parsed, dbItemId: existingDbId };
      }
      return next;
    });
  };

  const handleQtyAdjust = (itemId, delta) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      const current = next[itemId]?.quantity || 0;
      const updated = current + delta;
      if (updated <= 0) {
        delete next[itemId];
      } else {
        const existingDbId = prev[itemId]?.dbItemId || availableItems.find(i => i.id === itemId)?.dbItemId || itemId;
        next[itemId] = { quantity: updated, dbItemId: existingDbId };
      }
      return next;
    });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    const selectedKeys = Object.keys(selectedItems).filter(k => selectedItems[k].quantity > 0);
    if (selectedKeys.length === 0) {
      toast.error('Please select at least one item');
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
      return {
        itemId: item?.dbItemId || itemId,
        catalogId: item?.id || itemId,
        productName: item?.name || 'Product',
        quantity: selectedItems[itemId].quantity,
        price: item ? item.defaultPrice : 0
      };
    });

    try {
      const res = await fetch(`${API_URL}/orders/${order.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant': activeTenant
        },
        body: JSON.stringify({ 
          expectedDelivery: editData.expectedDelivery, 
          remarks: editData.remarks,
          type: orderType,
          items: orderItemsPayload
        }),
        credentials: 'include'
      });

      const json = await res.json();

      if (json.success) {
        toast.success('Order updated successfully!');
        onOrderEdited();
      } else {
        toast.error(json.message || 'Failed to update order');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error updating order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative border border-slate-100">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center z-10">
          <div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border bg-sky-50 text-[#0ea5e9] border-sky-200">
              {isWadaana ? 'WADAANA PREFORM ORDER' : 'AQUASPHERE ORDER'}
            </span>
            <h3 className="text-xl font-bold text-slate-800 mt-0.5">Edit Order: {order.customer?.name}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={submitEdit} className="p-6 space-y-6">
          
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center">
            <div>
              <div className="text-sm font-bold text-slate-800">{selectedCustomer?.name}</div>
              <div className="text-xs text-slate-500">ORD-{order.id.substring(0,6).toUpperCase()}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</div>
              <div className="font-extrabold text-slate-700">{order.paymentStatus}</div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Package size={15}/> Order Items ({isWadaana ? 'Single Preform Bottles' : 'AquaSphere Packs'})
            </h4>
            
            <div className="space-y-4">
              {categories.map(catLabel => {
                const catItems = availableItems.filter(i => i.categoryLabel === catLabel);
                return (
                  <div key={catLabel} className="space-y-1.5">
                    {/* Minimalist Section Header */}
                    <div className="flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <span className={`w-2 h-2 rounded-full ${catLabel.includes('PURE') ? 'bg-[#0ea5e9]' : catLabel.includes('MIX') ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                      <span>{catLabel}</span>
                      <span className="flex-1 h-px bg-slate-200/80"></span>
                    </div>

                    {/* Single Clean Row per Product */}
                    <div className="space-y-1.5">
                      {catItems.map(item => {
                        const isSelected = !!selectedItems[item.id];
                        const qty = selectedItems[item.id]?.quantity || 0;
                        const price = Math.round(item.defaultPrice);
                        const lineSubtotal = qty * price;

                        return (
                          <div 
                            key={item.id} 
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:py-2.5 sm:px-3.5 rounded-xl border transition-all ${
                              isSelected 
                                ? 'bg-sky-50/50 border-sky-300 ring-1 ring-sky-300/30 shadow-2xs' 
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {/* Product Info & Checkbox */}
                            <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 select-none">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleItemToggle(item.id)}
                                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-slate-800 text-sm truncate">
                                  {item.name}
                                </div>
                                <div className="text-xs text-slate-400 font-mono">
                                  Rs. {price.toLocaleString()} <span className="text-slate-400 font-sans">/ {item.unit}</span>
                                </div>
                              </div>
                            </label>

                            {/* Inline Stepper, Qty Input, and Line Total */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 mt-2 sm:mt-0 shrink-0">
                              <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleQtyAdjust(item.id, -1)}
                                  disabled={!isSelected}
                                  className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white transition"
                                  title="Decrease quantity"
                                >
                                  <Minus size={13} />
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={qty > 0 ? qty : ''}
                                  placeholder="0"
                                  onChange={(e) => handleItemQuantityChange(item.id, e.target.value)}
                                  className="w-16 h-8 text-center text-xs font-bold text-slate-800 border-x border-slate-200 focus:outline-none focus:bg-sky-50/50"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleQtyAdjust(item.id, 1)}
                                  className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition"
                                  title="Increase quantity"
                                >
                                  <Plus size={13} />
                                </button>
                              </div>

                              <div className="w-24 text-right">
                                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Subtotal</span>
                                <span className={`text-xs font-mono font-black ${isSelected ? 'text-emerald-700' : 'text-slate-300'}`}>
                                  Rs. {lineSubtotal.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex justify-between items-center font-mono">
              <span className="text-xs text-slate-700 font-extrabold uppercase">Estimated Total</span>
              <span className="text-xl font-black text-slate-950">₨ {Number(orderTotal).toLocaleString()}</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2"><Calendar size={14}/> Logistics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expected Delivery Date</label>
                <input name="expectedDelivery" type="date" className="input-base text-xs font-mono" value={editData.expectedDelivery} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Internal Remarks / Driver Notes</label>
                <textarea name="remarks" rows="2" className="input-base text-xs resize-none" value={editData.remarks} onChange={handleChange}></textarea>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="btn-secondary text-xs py-2 px-4">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary text-xs py-2 px-5">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
