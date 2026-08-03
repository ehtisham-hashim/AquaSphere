import { useState } from 'react';
import { X, Package, Calendar } from 'lucide-react';
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
      itemMap.set(normKey, {
        id: catItem.id,
        dbItemId: dbMatch?.id || null,
        name: catItem.name,
        category: catItem.category,
        categoryLabel: catItem.categoryLabel,
        defaultPrice: Math.round(catItem.defaultPrice),
        unit: catItem.unit
      });
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
      [itemId]: { ...prev[itemId], quantity: parseInt(qty) || 0 }
    }));
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

          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Package size={15}/> Order Items ({isWadaana ? 'Single Preform Bottles' : 'AquaSphere Packs'})
            </h4>
            
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
                                  onChange={() => handleItemToggle(item.id)}
                                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                                />
                                <div>
                                  <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                                  <span className="text-xs text-slate-400">Fixed Rate: Rs. {item.defaultPrice} / {item.unit}</span>
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
                                      Rs. {item.defaultPrice}
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
              <span className="text-sm text-sky-800 font-extrabold uppercase">Estimated Total</span>
              <span className="text-2xl font-black text-sky-950">Rs. {Number(orderTotal).toLocaleString()}</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Calendar size={15}/> Logistics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Expected Delivery Date (Optional)</label>
                <input name="expectedDelivery" type="date" className="w-full border border-slate-200 rounded-xl p-3 focus:border-sky-500 outline-none font-medium text-sm" value={editData.expectedDelivery} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Internal Remarks / Driver Notes</label>
                <textarea name="remarks" rows="2" className="w-full border border-slate-200 rounded-xl p-3 focus:border-sky-500 outline-none resize-none font-medium text-sm" value={editData.remarks} onChange={handleChange}></textarea>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="px-6 py-3 text-slate-600 font-semibold text-sm hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="bg-sky-600 hover:bg-sky-700 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-md disabled:opacity-50">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
