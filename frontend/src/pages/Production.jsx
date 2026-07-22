import { useState, useEffect } from 'react';
import { Plus, X, Factory, ArrowRight, Package, AlertTriangle, Clock } from 'lucide-react';

export default function Production() {
  const [items, setItems] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [batches, setBatches] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [outputItemId, setOutputItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [wasteQuantity, setWasteQuantity] = useState('');
  const [remarks, setRemarks] = useState('');

  const fetchData = async () => {
    try {
      const [itemsRes, batchesRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/items`, { credentials: 'include' }),
        fetch(`${import.meta.env.VITE_API_URL}/production`, { credentials: 'include' }).catch(() => ({ json: () => ({ success: true, data: [] }) }))
      ]);
      const [itemsData, batchesData] = await Promise.all([itemsRes.json(), batchesRes.json()]);
      if (itemsData.success) {
         setItems(itemsData.data.filter(i => i.type === 'FINISHED_GOOD'));
         setRawMaterials(itemsData.data.filter(i => i.type === 'RAW_MATERIAL'));
      }
      if (batchesData.success) setBatches(batchesData.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedItem = items.find(i => i.id === outputItemId);
  const recipes = selectedItem?.recipeFinishedGoods || [];
  const primaryRawMaterial = recipes.length > 0 ? recipes[0].rawMaterial : null;

  const submitBatch = async (e) => {
    e.preventDefault();
    await fetch(`${import.meta.env.VITE_API_URL}/production`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        outputItemId, 
        quantity, 
        wasteQuantity, 
        wasteItemId: primaryRawMaterial?.id,
        remarks 
      }),
      credentials: 'include'
    });
    setQuantity('');
    setWasteQuantity('');
    setRemarks('');
    setOutputItemId('');
    setIsModalOpen(false);
    fetchData();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Production</h2>
          <p className="text-slate-500 text-sm">Log factory batches and convert raw materials to finished goods</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={20} /> Log Batch
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {rawMaterials.map(rm => (
          <div key={rm.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <h4 className="text-sm font-semibold text-slate-600 truncate">{rm.name}</h4>
            <div className="mt-2 flex items-end justify-between">
              <span className="text-2xl font-bold text-slate-800">{Number(rm.cachedQty).toLocaleString()} <span className="text-xs text-slate-500 font-medium">{rm.unit}</span></span>
              {Number(rm.cachedQty) <= Number(rm.reorderLevel) && (
                 <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                   <AlertTriangle size={12}/> Low
                 </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
         <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2"><Factory size={18} className="text-slate-400"/> Recent Production Runs</h3>
         </div>
         <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-100">
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Output Item</th>
                <th className="p-4 font-semibold text-right">Good Yield</th>
                <th className="p-4 font-semibold text-right">Waste/Breakage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-12 text-center text-slate-500">
                    <Factory size={48} className="mx-auto text-slate-200 mb-4" />
                    <p>No production batches logged yet.</p>
                  </td>
                </tr>
              ) : (
                batches.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="p-4 text-sm text-slate-600"><div className="flex items-center gap-1.5"><Clock size={14} className="text-slate-400"/> {new Date(b.createdAt).toLocaleString()}</div></td>
                    <td className="p-4 font-medium text-slate-800">{b.outputItem?.name || 'Unknown Item'}</td>
                    <td className="p-4 text-right font-bold text-emerald-600">+{b.quantity} Packs</td>
                    <td className="p-4 text-right">
                      {b.wasteQuantity > 0 ? (
                         <span className="text-red-500 font-medium text-sm flex items-center justify-end gap-1"><AlertTriangle size={14}/> {b.wasteQuantity}</span>
                      ) : <span className="text-slate-300">-</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
         </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center z-10">
              <h3 className="text-lg font-bold text-slate-800">Log Production Batch</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 p-1.5 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={submitBatch} className="p-6 space-y-6">
              
              <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-1">Finished Good Produced *</label>
                   <select 
                     className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none bg-slate-50" 
                     value={outputItemId} 
                     onChange={e => setOutputItemId(e.target.value)} 
                     required
                   >
                     <option value="">Select Item...</option>
                     {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                   </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-1">Good Yield (Packs) *</label>
                     <div className="relative">
                        <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                        <input 
                          type="number" min="1"
                          className="w-full border border-slate-200 rounded-xl py-3 pl-10 pr-4 focus:border-emerald-500 outline-none" 
                          value={quantity} 
                          onChange={e => setQuantity(e.target.value)} 
                          required 
                        />
                     </div>
                   </div>
                   <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-1">Breakage / Waste</label>
                     <div className="relative">
                        <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                        <input 
                          type="number" min="0" placeholder="e.g. 5"
                          className="w-full border border-slate-200 rounded-xl py-3 pl-10 pr-4 focus:border-red-500 outline-none" 
                          value={wasteQuantity} 
                          onChange={e => setWasteQuantity(e.target.value)} 
                        />
                     </div>
                   </div>
                 </div>
              </div>

              {/* Live BOM Preview */}
              {selectedItem && (
                 <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Live Bill of Materials (BOM) Preview</h4>
                    {recipes.length > 0 ? (
                       <div className="space-y-2">
                          <div className="flex items-center gap-3 text-sm text-emerald-600 font-medium pb-2 border-b border-slate-200">
                             <ArrowRight size={16}/> 
                             <span>+{quantity || 0} x {selectedItem.name} (Finished Goods)</span>
                          </div>
                          {recipes.map(r => (
                             <div key={r.id} className="flex justify-between items-center text-sm text-slate-600 pl-7">
                                <span>- {(r.quantityPerUnit * (quantity || 0)).toLocaleString()} {r.rawMaterial.unit}</span>
                                <span className="font-medium text-slate-800">{r.rawMaterial.name}</span>
                             </div>
                          ))}
                          {wasteQuantity > 0 && primaryRawMaterial && (
                             <div className="flex justify-between items-center text-sm text-red-500 pl-7 mt-2 pt-2 border-t border-red-100">
                                <span>- {wasteQuantity} {primaryRawMaterial.unit} (WASTE)</span>
                                <span className="font-medium">{primaryRawMaterial.name}</span>
                             </div>
                          )}
                       </div>
                    ) : (
                       <div className="text-sm text-amber-600 flex items-center gap-2">
                          <AlertTriangle size={16}/> No recipe configured for this item. Only Finished Good inventory will increase.
                       </div>
                    )}
                 </div>
              )}

              <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1">Remarks (Optional)</label>
                 <input 
                   type="text" placeholder="Note any issues during production..."
                   className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none" 
                   value={remarks} 
                   onChange={e => setRemarks(e.target.value)} 
                 />
              </div>

              <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition-colors">
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
