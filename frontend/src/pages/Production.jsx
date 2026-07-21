import { useState, useEffect } from 'react';
import { Plus, X, Factory, ArrowRight, Package } from 'lucide-react';

export default function Production() {
  const [items, setItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [outputItemId, setOutputItemId] = useState('');
  const [quantity, setQuantity] = useState('');

  useEffect(() => {
    fetch('http://localhost:3000/api/v1/items', { credentials: 'include' })
      .then(res => res.json())
      .then(d => { if (d.success) setItems(d.data.filter(i => i.type === 'FINISHED_GOOD')); });
  }, []);

  const submitBatch = async (e) => {
    e.preventDefault();
    await fetch('http://localhost:3000/api/v1/production', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputItemId, quantity }),
      credentials: 'include'
    });
    setQuantity('');
    setIsModalOpen(false);
    alert('Batch recorded!');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Production</h2>
          <p className="text-slate-500 text-sm">Log factory batches and finished goods</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Log Batch
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
         <Factory size={48} className="text-slate-200 mb-4" />
         <h3 className="text-lg font-bold text-slate-700 mb-2">Factory Floor</h3>
         <p className="text-slate-500 max-w-sm">When the factory produces a batch of PET packs or 19L refills, log it here. This automatically adds the Finished Goods to your inventory.</p>
         <button onClick={() => setIsModalOpen(true)} className="mt-6 text-blue-600 font-bold hover:underline">Log your first batch</button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Log Production Batch</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={submitBatch} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Finished Good *</label>
                <select 
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                  value={outputItemId} 
                  onChange={e => setOutputItemId(e.target.value)} 
                  required
                >
                  <option value="">Select Item...</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity Produced *</label>
                <div className="relative">
                   <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                   <input 
                     type="number" 
                     className="w-full border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                     value={quantity} 
                     onChange={e => setQuantity(e.target.value)} 
                     required 
                   />
                </div>
              </div>

              <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs flex gap-2 items-center">
                <ArrowRight size={14} className="flex-shrink-0"/>
                <span>Logging this batch will instantly increase your Finished Goods inventory by {quantity || '0'}.</span>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors">
                  Submit Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
