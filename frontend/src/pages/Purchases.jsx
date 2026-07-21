import { useState, useEffect } from 'react';
import { Plus, X, Receipt, ShoppingCart, DollarSign, PackageOpen } from 'lucide-react';

export default function Purchases() {
  const [vendors, setVendors] = useState([]);
  const [items, setItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [purchaseData, setPurchaseData] = useState({
    vendorId: '', itemId: '', quantity: '', price: '', receiptUrl: ''
  });

  useEffect(() => {
    fetch('http://localhost:3000/api/v1/vendors', { credentials: 'include' })
      .then(res => res.json())
      .then(d => { if (d.success) setVendors(d.data); });
    
    fetch('http://localhost:3000/api/v1/items', { credentials: 'include' })
      .then(res => res.json())
      .then(d => { if (d.success) setItems(d.data.filter(i => i.type === 'RAW_MATERIAL')); });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPurchaseData(prev => ({ ...prev, [name]: value }));
  };

  const addPurchase = async (e) => {
    e.preventDefault();
    await fetch('http://localhost:3000/api/v1/vendors/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(purchaseData),
      credentials: 'include'
    });
    setPurchaseData({ vendorId: '', itemId: '', quantity: '', price: '', receiptUrl: '' });
    setIsModalOpen(false);
    alert('Purchase recorded!');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Purchases</h2>
          <p className="text-slate-500 text-sm">Log inbound raw materials from vendors</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Log Purchase
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
         <ShoppingCart size={48} className="text-slate-200 mb-4" />
         <h3 className="text-lg font-bold text-slate-700 mb-2">No Recent Purchases</h3>
         <p className="text-slate-500 max-w-sm">When you buy raw materials like Bottles, Caps, or Labels from vendors, log them here to update inventory.</p>
         <button onClick={() => setIsModalOpen(true)} className="mt-6 text-indigo-600 font-bold hover:underline">Log your first purchase</button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden">
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Log Raw Material Purchase</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={addPurchase} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vendor *</label>
                  <select name="vendorId" className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" value={purchaseData.vendorId} onChange={handleChange} required>
                    <option value="">Select Vendor...</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Raw Material *</label>
                  <select name="itemId" className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" value={purchaseData.itemId} onChange={handleChange} required>
                    <option value="">Select Item...</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity Received *</label>
                  <div className="relative">
                    <PackageOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <input name="quantity" type="number" step="0.01" className="w-full border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" value={purchaseData.quantity} onChange={handleChange} required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Total Invoice Price (Rs) *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <input name="price" type="number" step="0.01" className="w-full border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" value={purchaseData.price} onChange={handleChange} required />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Receipt / Invoice Link (Optional)</label>
                  <div className="relative">
                    <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <input name="receiptUrl" type="url" className="w-full border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" value={purchaseData.receiptUrl} onChange={handleChange} placeholder="https://..." />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors">
                  Log Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
