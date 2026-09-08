import { useState, useEffect } from 'react';
import { X, Package, Check, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL as API } from '../../utils/api';

const COMMON_UNITS = ['pcs', 'kg', 'litres', 'bags', 'rolls', 'boxes', 'packs'];

export default function AddEditRawMaterialModal({ 
  isOpen, 
  onClose, 
  onSaved, 
  editingItem = null, 
  tenant = 'aquasphere' 
}) {
  const isWadaana = tenant === 'wadaana';
  const defaultUnit = isWadaana ? 'kg' : 'pcs';

  const [name, setName] = useState('');
  const [unit, setUnit] = useState(defaultUnit);
  const [reorderLevel, setReorderLevel] = useState('100');
  const [stock, setStock] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (editingItem) {
      setName(editingItem.name || '');
      setUnit(editingItem.unit || defaultUnit);
      setReorderLevel(String(editingItem.reorderLevel ?? 100));
      setStock('');
    } else {
      setName('');
      setUnit(defaultUnit);
      setReorderLevel('100');
      setStock('');
    }
  }, [isOpen, editingItem, defaultUnit]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Material name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (editingItem) {
        const res = await fetch(`${API}/items/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-tenant': tenant },
          credentials: 'include',
          body: JSON.stringify({
            name: cleanName,
            unit,
            reorderLevel: parseFloat(reorderLevel || 0),
            quantityToAdd: parseFloat(stock || 0),
            type: 'RAW_MATERIAL'
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to update raw material');
        }
        toast.success(`"${cleanName}" updated successfully`);
      } else {
        const res = await fetch(`${API}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-tenant': tenant },
          credentials: 'include',
          body: JSON.stringify({
            name: cleanName,
            unit,
            reorderLevel: parseFloat(reorderLevel || 0),
            initialStock: parseFloat(stock || 0),
            type: 'RAW_MATERIAL'
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to add raw material');
        }
        toast.success(`"${cleanName}" added successfully`);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isWadaana ? 'bg-sky-100 text-[#0ea5e9]' : 'bg-emerald-100 text-emerald-700'}`}>
              <Package size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">
                {editingItem ? 'Edit Raw Material' : 'Add Raw Material'}
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                {editingItem ? `Update ${editingItem.name}` : `Create a new raw material for ${isWadaana ? 'Wadaana' : 'AquaSphere'}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 font-medium">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Material Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Material Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isWadaana ? 'e.g. Pure Preform (0.5L - 15g)' : 'e.g. PET Bottles (500ml)'}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition"
            />
          </div>

          {/* Unit of Measure */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Unit of Measure <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                value={COMMON_UNITS.includes(unit) ? unit : 'other'}
                onChange={(e) => {
                  if (e.target.value !== 'other') setUnit(e.target.value);
                }}
                className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition"
              >
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u.toUpperCase()}
                  </option>
                ))}
                <option value="other">Custom...</option>
              </select>
              <input
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Unit (e.g. kg, pcs)"
                className="flex-1 text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition"
              />
            </div>
          </div>

          {/* Reorder Level & Stock Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Reorder Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Reorder Level ({unit || 'units'})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                placeholder="100"
                className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition"
              />
              <p className="text-[10px] text-slate-400 font-medium">Low-stock alert triggers at this level.</p>
            </div>

            {/* Stock Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {editingItem ? `Add Stock (${unit || 'units'})` : `Initial Stock (${unit || 'units'})`}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder={editingItem ? '0 (optional)' : '0'}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition"
              />
              {editingItem ? (
                <p className="text-[10px] text-slate-400 font-medium">
                  Current: <span className="font-bold text-slate-700">{Number(editingItem.cachedQty || 0).toLocaleString()} {editingItem.unit}</span>
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 font-medium">Opening stock balance (optional).</p>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition flex items-center gap-1.5 ${
                isWadaana ? 'bg-sky-600 hover:bg-sky-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {saving ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={13} />
                  <span>{editingItem ? 'Save Changes' : 'Add Material'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
