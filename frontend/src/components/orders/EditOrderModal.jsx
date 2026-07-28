import { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { API_URL } from '../../utils/api';

export default function EditOrderModal({ order, onClose, onOrderEdited }) {
  const [editData, setEditData] = useState({
    expectedDelivery: order.expectedDelivery ? new Date(order.expectedDelivery).toISOString().split('T')[0] : '',
    remarks: order.remarks || ''
  });

  const handleChange = (e) => setEditData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const submitEdit = async (e) => {
    e.preventDefault();
    await fetch(`${API_URL}/orders/${order.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
      credentials: 'include'
    });
    onOrderEdited();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Edit Order: {order.customer?.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-1.5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={submitEdit} className="p-6 space-y-5">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600">
            <strong>Order ID:</strong> ORD-{order.id.substring(0,6).toUpperCase()}<br/>
            <strong>Product:</strong> {order.type}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
              <Calendar size={16}/> Expected Delivery Date (Optional)
            </label>
            <input 
              name="expectedDelivery" 
              type="date" 
              className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none" 
              value={editData.expectedDelivery} 
              onChange={handleChange} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Order Remarks / Internal Notes</label>
            <textarea 
              name="remarks" 
              rows="3" 
              className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none resize-none" 
              value={editData.remarks} 
              onChange={handleChange}
            ></textarea>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
            <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
