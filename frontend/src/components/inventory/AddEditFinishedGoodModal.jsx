import { useState, useEffect } from 'react';
import { X, PackageCheck, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL as API } from '../../utils/api';

export default function AddEditFinishedGoodModal({
  isOpen,
  onClose,
  onSaved,
  tenant = 'aquasphere',
  itemToEdit = null
}) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('packs');
  const [reorderLevel, setReorderLevel] = useState(20);
  const [initialStock, setInitialStock] = useState('');

  // Raw materials list: array of DB items
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  // Map of rawMaterialId -> quantity string (e.g. { "id1": "12", "id2": "0.015" })
  const [materialQuantities, setMaterialQuantities] = useState({});
  const [saving, setSaving] = useState(false);

  // Fetch available raw materials and populate itemToEdit when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchRawMaterialsAndPopulate = async () => {
      setLoadingMaterials(true);
      try {
        const res = await fetch(`${API}/items?type=RAW_MATERIAL`, {
          headers: { 'x-tenant': tenant },
          credentials: 'include'
        });
        const json = await res.json();
        const materialsList = (json.data || []).filter(m => m.type === 'RAW_MATERIAL' && !m.archivedAt);
        setRawMaterials(materialsList);

        if (itemToEdit) {
          setName(itemToEdit.name || '');
          setUnit(itemToEdit.unit || 'packs');
          setReorderLevel(Number(itemToEdit.reorderLevel || 0));
          setInitialStock('');

          const qtyMap = {};
          (itemToEdit.recipeFinishedGoods || []).forEach(r => {
            const q = Number(r.quantityPerUnit || 0);
            if (q > 0) {
              qtyMap[r.rawMaterialId] = String(q);
            }
          });
          setMaterialQuantities(qtyMap);
        } else {
          setName('');
          setUnit('packs');
          setReorderLevel(20);
          setInitialStock('');
          setMaterialQuantities({});
        }
      } catch (err) {
        console.error('Failed to load raw materials for recipe builder:', err);
        toast.error('Failed to load raw materials');
      } finally {
        setLoadingMaterials(false);
      }
    };

    fetchRawMaterialsAndPopulate();
  }, [isOpen, tenant, itemToEdit]);

  if (!isOpen) return null;

  const handleQtyChange = (rmId, value) => {
    setMaterialQuantities(prev => ({
      ...prev,
      [rmId]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Product name is required');

    // Build recipe payload: any raw material with qty > 0 is included
    const validRecipe = [];
    for (const [rmId, qtyStr] of Object.entries(materialQuantities)) {
      const q = parseFloat(qtyStr);
      if (!isNaN(q) && q > 0) {
        validRecipe.push({
          rawMaterialId: rmId,
          quantityPerUnit: q
        });
      }
    }

    setSaving(true);
    try {
      const url = itemToEdit ? `${API}/items/${itemToEdit.id}` : `${API}/items`;
      const method = itemToEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          type: 'FINISHED_GOOD',
          unit: unit.trim() || 'packs',
          reorderLevel: parseFloat(reorderLevel) || 0,
          initialStock: parseFloat(initialStock) || 0,
          recipe: validRecipe
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to save finished good');
      }

      toast.success(itemToEdit ? `Finished good "${name.trim()}" updated successfully` : `Finished good "${name.trim()}" created successfully`);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to save finished good');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[70] animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-base">
              {itemToEdit ? 'Edit Finished Good & Recipe' : 'Add New Finished Good & Recipe'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {/* Basic Item Details */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Product Information
            </h4>
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 6L Canister (Pack of 2)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="packs">packs</option>
                  <option value="bottles">bottles</option>
                  <option value="pcs">pcs</option>
                  <option value="litres">litres</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reorder Level (Alert)</label>
                <input
                  type="number"
                  min="0"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Stock</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Bill of Materials (Pre-populated list of all raw materials) */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Recipe Consumption (Per 1 Finished Unit)
                </h4>
                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <Info size={12} className="text-sky-500" />
                  Enter consumption quantity. Leave 0 or blank if raw material is not used in recipe.
                </p>
              </div>
            </div>

            {loadingMaterials ? (
              <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                Loading raw materials catalog...
              </div>
            ) : rawMaterials.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                No raw materials found in inventory.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                <div className="grid grid-cols-12 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <div className="col-span-7">Raw Material</div>
                  <div className="col-span-2 text-right">In Stock</div>
                  <div className="col-span-3 text-right">Quantity Required</div>
                </div>

                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {rawMaterials.map((mat) => {
                    const currentVal = materialQuantities[mat.id] || '';
                    const isIncluded = parseFloat(currentVal) > 0;

                    return (
                      <div
                        key={mat.id}
                        className={`grid grid-cols-12 items-center px-3 py-2 text-xs transition-colors ${
                          isIncluded ? 'bg-sky-50/50' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="col-span-7 flex items-center gap-2 min-w-0 pr-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isIncluded ? 'bg-sky-500 ring-2 ring-sky-200' : 'bg-slate-200'
                            }`}
                          />
                          <span className={`font-medium truncate ${isIncluded ? 'text-slate-900 font-bold' : 'text-slate-700'}`}>
                            {mat.name}
                          </span>
                        </div>

                        <div className="col-span-2 text-right font-mono text-slate-500 text-[11px]">
                          {Math.round(Number(mat.cachedQty || 0)).toLocaleString()}{' '}
                          <span className="text-[10px] text-slate-400 font-sans">{mat.unit}</span>
                        </div>

                        <div className="col-span-3 flex items-center justify-end gap-1.5 pl-2">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0"
                            value={currentVal}
                            onChange={(e) => handleQtyChange(mat.id, e.target.value)}
                            className={`w-20 px-2 py-1 text-right text-xs font-mono rounded-lg border focus:outline-none transition ${
                              isIncluded
                                ? 'border-sky-400 bg-white ring-1 ring-sky-300 font-bold text-slate-900'
                                : 'border-slate-200 bg-slate-50/50 text-slate-600 focus:bg-white focus:border-sky-400'
                            }`}
                          />
                          <span className="text-[11px] font-semibold text-slate-400 w-7 shrink-0 text-left">
                            {mat.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="btn-secondary text-xs py-2 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
              {saving ? 'Saving...' : itemToEdit ? 'Update Finished Good' : 'Create Finished Good'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
