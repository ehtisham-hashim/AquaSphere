import { useState, useEffect } from 'react';
import { X, Plus, Trash2, PackageCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL as API } from '../../utils/api';

export default function AddEditFinishedGoodModal({
  isOpen,
  onClose,
  onSaved,
  tenant = 'aquasphere'
}) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('packs');
  const [reorderLevel, setReorderLevel] = useState(20);
  const [initialStock, setInitialStock] = useState('');

  // Raw materials catalog for recipe builder
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  // Recipe ingredients state: [{ rawMaterialId: '', quantityPerUnit: '' }]
  const [recipe, setRecipe] = useState([
    { rawMaterialId: '', quantityPerUnit: '' }
  ]);

  const [saving, setSaving] = useState(false);

  // Fetch available raw materials when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setName('');
    setUnit('packs');
    setReorderLevel(20);
    setInitialStock('');
    setRecipe([{ rawMaterialId: '', quantityPerUnit: '' }]);

    const fetchRawMaterials = async () => {
      setLoadingMaterials(true);
      try {
        const res = await fetch(`${API}/items?type=RAW_MATERIAL`, {
          headers: { 'x-tenant': tenant },
          credentials: 'include'
        });
        const json = await res.json();
        if (json.success || res.ok) {
          const materialsList = (json.data || []).filter(m => m.type === 'RAW_MATERIAL' && !m.archivedAt);
          setRawMaterials(materialsList);
        }
      } catch (err) {
        console.error('Failed to load raw materials for recipe builder:', err);
        toast.error('Failed to load raw materials');
      } finally {
        setLoadingMaterials(false);
      }
    };

    fetchRawMaterials();
  }, [isOpen, tenant]);

  if (!isOpen) return null;

  const handleAddIngredient = () => {
    setRecipe(prev => [...prev, { rawMaterialId: '', quantityPerUnit: '' }]);
  };

  const handleRemoveIngredient = (index) => {
    setRecipe(prev => prev.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index, field, value) => {
    setRecipe(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Product name is required');

    // Filter valid recipe entries
    const validRecipe = recipe
      .filter(r => r.rawMaterialId && parseFloat(r.quantityPerUnit) > 0)
      .map(r => ({
        rawMaterialId: r.rawMaterialId,
        quantityPerUnit: parseFloat(r.quantityPerUnit)
      }));

    // Check for duplicate raw materials in recipe
    const materialIds = validRecipe.map(r => r.rawMaterialId);
    if (new Set(materialIds).size !== materialIds.length) {
      return toast.error('Duplicate raw material detected in recipe. Please merge quantities.');
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/items`, {
        method: 'POST',
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
        throw new Error(json.message || 'Failed to create finished good');
      }

      toast.success(`Finished good "${name.trim()}" created successfully`);
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
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-base">Add New Finished Good & Recipe</h3>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reorder Level</label>
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

          {/* Bill of Materials (Recipe Builder) */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Bill of Materials (Recipe)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Select raw materials consumed to produce 1 unit of this finished good
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-md transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Ingredient
              </button>
            </div>

            {loadingMaterials ? (
              <div className="py-4 text-center text-xs text-slate-400">Loading raw materials...</div>
            ) : recipe.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                No ingredients added yet. Click &quot;Add Ingredient&quot; to define consumption.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recipe.map((item, index) => {
                  const selectedMat = rawMaterials.find(m => m.id === item.rawMaterialId);
                  return (
                    <div key={index} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="flex-1">
                        <select
                          required
                          value={item.rawMaterialId}
                          onChange={(e) => handleIngredientChange(index, 'rawMaterialId', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                          <option value="">-- Select Raw Material --</option>
                          {rawMaterials.map(mat => (
                            <option key={mat.id} value={mat.id}>
                              {mat.name} ({mat.unit}) - Stock: {Number(mat.cachedQty || 0).toLocaleString()}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-28 flex items-center gap-1">
                        <input
                          type="number"
                          step="any"
                          min="0.00001"
                          required
                          placeholder="Qty"
                          value={item.quantityPerUnit}
                          onChange={(e) => handleIngredientChange(index, 'quantityPerUnit', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                        <span className="text-[11px] font-semibold text-slate-500 w-8 truncate">
                          {selectedMat?.unit || ''}
                        </span>
                      </div>

                      {recipe.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(index)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Remove Ingredient"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold transition shadow-sm flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Create Finished Good'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
