import { useState } from 'react';
import { X, Package, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';
import { getOrderPrice as getPrice, getOrderCleanName as getCleanName } from '../../constants/orders';

export default function EditOrderModal({ order, onClose, onOrderEdited, items }) {
  const [editData, setEditData] = useState({
    expectedDelivery: order.expectedDelivery ? new Date(order.expectedDelivery).toISOString().split('T')[0] : '',
    remarks: order.remarks || ''
  });

  const [selectedItems, setSelectedItems] = useState(() => {
    const initialItems = {};
    if (order.items && order.items.length > 0) {
      order.items.forEach(i => {
        initialItems[i.itemId] = { quantity: i.quantity };
      });
    }
    return initialItems;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCustomer = order.customer;



  const orderTotal = Object.entries(selectedItems).reduce((sum, [itemId, data]) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return sum;
    const price = getPrice(item, selectedCustomer);
    return sum + (price * data.quantity);
  }, 0).toFixed(2);

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
      [itemId]: { quantity: parseInt(qty) || 0 }
    }));
  };

  const submitEdit = async (e) => {
    e.preventDefault();
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
      const res = await fetch(`${API_URL}/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl relative">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center z-10">
          <h3 className="text-xl font-bold text-slate-800">Edit Order: {order.customer?.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={submitEdit} className="p-6 space-y-8">
          
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex justify-between items-center">
            <div>
              <div className="text-sm font-medium text-slate-800">{selectedCustomer?.name}</div>
              <div className="text-xs text-slate-500">ORD-{order.id.substring(0,6).toUpperCase()}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 uppercase tracking-wide">Status</div>
              <div className="font-bold text-slate-700">{order.paymentStatus}</div>
            </div>
          </div>

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

          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Calendar size={16}/> Logistics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery Date (Optional)</label>
                <input name="expectedDelivery" type="date" className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none" value={editData.expectedDelivery} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Internal Remarks / Driver Notes</label>
                <textarea name="remarks" rows="2" className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none resize-none" value={editData.remarks} onChange={handleChange}></textarea>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="px-6 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-sm disabled:opacity-50">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
