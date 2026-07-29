import { useState, useEffect } from 'react';
import { X, Sparkles, Package, Flame } from 'lucide-react';

import { API_URL as API } from '../../utils/api';

const WADAANA_PRESETS = [
  { name: 'Pure Preform (0.5L - 15g)', unit: 'kg', reorderLevel: 100 },
  { name: 'Pure Preform (1.5L - 30g)', unit: 'kg', reorderLevel: 100 },
  { name: 'Mix Preform (0.5L - 13g)', unit: 'kg', reorderLevel: 100 },
  { name: 'Mix Preform (1.5L - 27g)', unit: 'kg', reorderLevel: 100 }
];

const AQUASPHERE_PRESETS = [
  { name: 'PET Bottles (500ml)', unit: 'pcs', reorderLevel: 2000 },
  { name: 'PET Bottles (1500ml)', unit: 'pcs', reorderLevel: 1500 },
  { name: 'Bottle Caps (Standard)', unit: 'pcs', reorderLevel: 5000 },
  { name: 'Labels (500ml)', unit: 'pcs', reorderLevel: 3000 },
  { name: 'Labels (1500ml)', unit: 'pcs', reorderLevel: 2500 },
  { name: 'Shrink Wrap Rolls', unit: 'rolls', reorderLevel: 20 },
  { name: 'Minerals & Salts (Calcium/Magnesium)', unit: 'kg', reorderLevel: 50 }
];

export default function AddEditRawMaterialModal({ 
  isOpen, 
  onClose, 
  onSaved, 
  editingItem = null, 
  tenant = 'aquasphere' 
}) {
  const isWadaana = tenant === 'wadaana';
  const [formData, setFormData] = useState({ name: '', unit: isWadaana ? 'kg' : 'pcs', reorderLevel: 100, grams: '15', initialStock: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingItem) {
      // Extract grams from name if available e.g. (15g)
      const matchGrams = editingItem.name?.match(/(\d+)\s*g/i);
      setFormData({
        name: editingItem.name || '',
        unit: editingItem.unit || (isWadaana ? 'kg' : 'pcs'),
        reorderLevel: parseFloat(editingItem.reorderLevel || 0),
        grams: matchGrams ? matchGrams[1] : '15',
        initialStock: ''
      });
    } else {
      setFormData({ name: '', unit: isWadaana ? 'kg' : 'pcs', reorderLevel: 100, grams: '15', initialStock: '' });
    }
    setError('');
  }, [editingItem, isOpen, isWadaana]);

  if (!isOpen) return null;

  const handlePresetSelect = (preset) => {
    const matchGrams = preset.name.match(/(\d+)\s*g/i);
    setFormData({
      name: preset.name,
      unit: preset.unit,
      reorderLevel: preset.reorderLevel,
      grams: matchGrams ? matchGrams[1] : '15'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let finalName = formData.name.trim();
    if (isWadaana && formData.grams && !finalName.toLowerCase().includes('g')) {
      finalName = `${finalName} (${formData.grams}g)`;
    }

    setSaving(true);
    setError('');
    const url = editingItem ? `${API}/items/${editingItem.id}` : `${API}/items`;
    const method = editingItem ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        body: JSON.stringify({
          ...formData,
          name: finalName,
          reorderLevel: parseFloat(formData.reorderLevel || 0),
          initialStock: parseFloat(formData.initialStock || 0),
          type: 'RAW_MATERIAL'
        }),
        credentials: 'include'
      });

      const json = await res.json();
      if (!json.success && !res.ok) {
        setError(json.message || 'Error saving material');
        return;
      }

      onSaved(json.data || {});
      onClose();
    } catch (err) {
      setError('Network error. Could not save material.');
    } finally {
      setSaving(false);
    }
  };

  const presets = isWadaana ? WADAANA_PRESETS : AQUASPHERE_PRESETS;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className={`px-6 py-5 flex justify-between items-center border-b border-slate-100 shrink-0 ${
          isWadaana ? 'bg-gradient-to-r from-sky-50 to-white' : 'bg-gradient-to-r from-emerald-50 to-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isWadaana ? 'bg-[#0ea5e9]/10 text-[#0ea5e9]' : 'bg-emerald-100 text-emerald-600'}`}>
              {isWadaana ? <Flame size={22} /> : <Package size={22} />}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">
                {editingItem ? 'Edit Raw Material' : (isWadaana ? 'Add Preform Material' : 'Add Plant Material')}
              </h3>
              <p className="text-xs text-slate-500">
                {isWadaana ? 'Wadaana Industries Preform Specs' : 'AquaSphere Bottling & Plant Stock'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Presets Selector (only show when adding new material) */}
          {!editingItem && (
            <div className="space-y-2.5">
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className={isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'} />
                <span>Quick Select Standard Presets ({isWadaana ? 'Wadaana Preforms' : 'Water Plant'})</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePresetSelect(p)}
                    className={`text-left text-xs font-semibold p-2.5 rounded-xl border transition-all ${
                      formData.name === p.name 
                        ? (isWadaana ? 'border-[#0ea5e9] bg-sky-50 text-[#0ea5e9] shadow-sm' : 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm') 
                        : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="truncate font-bold">{p.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Unit: {p.unit} &bull; Reorder: {p.reorderLevel}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Material / Preform Name *</label>
              <input
                className={`w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 ${
                  isWadaana ? 'focus:border-[#0ea5e9] focus:ring-[#0ea5e9]/20' : 'focus:border-emerald-500 focus:ring-emerald-500/20'
                } text-sm font-medium transition-all shadow-sm`}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={isWadaana ? 'e.g. Pure Preform (0.5L - 15g)' : 'e.g. Calcium, Labels, Caps'}
                required
              />
              {isWadaana && (
                <p className="text-xs text-slate-400 mt-1">
                  Note: Wadaana raw materials are exclusively Pure or Mix Preform hierarchy.
                </p>
              )}
            </div>

            {/* Measurement Unit & Reorder Alert Level (Only for AquaSphere - Wadaana defaults to kg & 100) */}
            {!isWadaana && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Measurement Unit *</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:border-emerald-500 focus:ring-emerald-500/20 text-sm font-semibold text-slate-800 transition-all shadow-sm"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="kg">kg (Kilograms)</option>
                    <option value="litres">litres (Litres)</option>
                    <option value="rolls">rolls (Rolls)</option>
                    <option value="boxes">boxes (Boxes)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Reorder Alert Level *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:border-emerald-500 focus:ring-emerald-500/20 text-sm font-semibold transition-all shadow-sm"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                    placeholder="100"
                    required
                  />
                </div>
              </div>
            )}

            {/* Stock Addition / Quantity Field */}
            <div className={`p-4 rounded-xl border ${
              isWadaana ? 'bg-sky-50/40 border-sky-200/60' : 'bg-emerald-50/40 border-emerald-200/60'
            } space-y-1.5`}>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>{editingItem ? 'Add Stock Quantity' : 'Initial Stock Quantity'} ({isWadaana ? 'kg' : (formData.unit || 'pcs')})</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold ${
                  isWadaana ? 'bg-sky-100 text-[#0ea5e9]' : 'bg-emerald-100 text-emerald-700'
                }`}>Appends to Stock</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={`w-full border border-slate-200 rounded-xl p-3 bg-white focus:outline-none focus:ring-2 ${
                    isWadaana ? 'focus:border-[#0ea5e9] focus:ring-[#0ea5e9]/20' : 'focus:border-emerald-500 focus:ring-emerald-500/20'
                  } text-sm font-bold text-slate-800 transition-all shadow-sm`}
                  value={formData.initialStock}
                  onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                  placeholder={editingItem ? 'e.g. 100 (adds 100 to stock)' : 'e.g. 250 (initial stock)'}
                />
                <span className="text-xs font-extrabold text-slate-500 bg-white border border-slate-200 px-3.5 py-3 rounded-xl uppercase">
                  {isWadaana ? 'kg' : (formData.unit || 'pcs')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {editingItem 
                  ? `Enter amount to add to current stock (${editingItem.cachedQty || 0} ${editingItem.unit || (isWadaana ? 'kg' : 'pcs')}). Updates existing item balance.`
                  : 'If item already exists, this quantity will automatically append to its existing stock balance.'}
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`${
                isWadaana ? 'bg-[#0ea5e9] hover:bg-[#0284c7] shadow-sky-500/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              } text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all active:scale-[0.98] text-sm disabled:opacity-50`}
            >
              {saving ? 'Saving...' : (editingItem ? 'Update Material' : 'Save Material')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
