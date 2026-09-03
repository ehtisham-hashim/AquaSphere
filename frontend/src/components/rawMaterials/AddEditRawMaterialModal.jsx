import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Package, Flame, Sparkles, Plus, Minus, Check, ChevronDown } from 'lucide-react';
import { API_URL as API } from '../../utils/api';

const UNITS = ['kg', 'pcs', 'litres', 'rolls', 'bottles', 'packs', 'bags'];

function CustomUnitDropdown({ value, onChange, options, isWadaana }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div ref={ref} className="relative sm:col-span-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full px-3.5 py-3 bg-white border rounded-xl font-bold text-slate-800 flex items-center justify-between shadow-2xs transition text-xs ${
          open 
            ? (isWadaana ? 'border-[#0ea5e9] ring-1 ring-sky-200' : 'border-emerald-500 ring-1 ring-emerald-200') 
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className="truncate">{value}</span>
        <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[120px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full px-4 py-2 text-left text-xs font-bold transition flex items-center justify-between ${
                value === opt 
                  ? (isWadaana ? 'bg-sky-50 text-[#0ea5e9]' : 'bg-emerald-50 text-emerald-700') 
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{opt}</span>
              {value === opt && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const PRESETS = {
  aquasphere: [
    { id: '19l_bottles', name: 'Empty 19L Bottles', unit: 'pcs', defaultReorder: 50 },
    { id: 'pet_500ml', name: 'PET Bottles (500ml)', unit: 'pcs', defaultReorder: 2000 },
    { id: 'pet_1500ml', name: 'PET Bottles (1500ml)', unit: 'pcs', defaultReorder: 1500 },
    { id: 'small_caps', name: 'Small Caps', unit: 'pcs', defaultReorder: 2000 },
    { id: 'large_caps', name: 'Large Caps', unit: 'pcs', defaultReorder: 100 },
    { id: 'calcium', name: 'Calcium', unit: 'kg', defaultReorder: 120 },
    { id: 'magnesium', name: 'Magnesium', unit: 'kg', defaultReorder: 100 },
    { id: 'sodium', name: 'Sodium', unit: 'kg', defaultReorder: 100 },
    { id: 'labels_500ml', name: 'Labels (500ml)', unit: 'pcs', defaultReorder: 3000 },
    { id: 'labels_1500ml', name: 'Labels (1500ml)', unit: 'pcs', defaultReorder: 2500 },
    { id: 'shrink_wrap', name: 'Shrink Wrap', unit: 'kg', defaultReorder: 50 }
  ],
  wadaana: [
    { id: 'pure_05l_15g', name: 'Pure Preform (0.5L - 15g)', unit: 'kg', defaultReorder: 100 },
    { id: 'pure_15l_30g', name: 'Pure Preform (1.5L - 30g)', unit: 'kg', defaultReorder: 100 },
    { id: 'mix_05l_13g', name: 'Mix Preform (0.5L - 13g)', unit: 'kg', defaultReorder: 100 },
    { id: 'mix_15l_27g', name: 'Mix Preform (1.5L - 27g)', unit: 'kg', defaultReorder: 100 }
  ]
};

export default function AddEditRawMaterialModal({ 
  isOpen, 
  onClose, 
  onSaved, 
  editingItem = null, 
  existingMaterials = [],
  tenant = 'aquasphere' 
}) {
  const isWadaana = tenant === 'wadaana';
  const defaultUnit = isWadaana ? 'kg' : 'pcs';

  // Map of item quantities: { [id]: number | string }
  const [quantities, setQuantities] = useState({});
  const [custom, setCustom] = useState({ name: '', unit: defaultUnit, stock: '' });
  const [editData, setEditData] = useState({ reorder: 100, addStock: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Merge tenant presets with existing DB items so custom materials appear in the list
  const materialList = useMemo(() => {
    const list = [...(PRESETS[tenant] || PRESETS.aquasphere)];
    existingMaterials.forEach(m => {
      if (m.type === 'RAW_MATERIAL' && !m.archivedAt && !list.some(p => p.name.toLowerCase() === m.name.toLowerCase())) {
        list.push({ id: m.id, name: m.name, unit: m.unit || defaultUnit, defaultReorder: Number(m.reorderLevel || 100), isCustom: true });
      }
    });
    return list;
  }, [tenant, existingMaterials, defaultUnit]);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setQuantities({});
    setCustom({ name: '', unit: defaultUnit, stock: '' });
    if (editingItem) {
      setEditData({ reorder: editingItem.reorderLevel || 100, addStock: '' });
    }
  }, [isOpen, editingItem, defaultUnit]);

  if (!isOpen) return null;

  // 1. Create single custom item directly in DB
  const handleAddCustom = async () => {
    const name = custom.name.trim();
    if (!name) return setError('Please enter material name');
    if (materialList.some(m => m.name.toLowerCase() === name.toLowerCase())) {
      return setError(`"${name}" already exists in raw materials.`);
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant': tenant },
        credentials: 'include',
        body: JSON.stringify({
          name,
          unit: custom.unit,
          initialStock: parseFloat(custom.stock || 0),
          reorderLevel: 100,
          type: 'RAW_MATERIAL'
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to add custom material');
      setCustom({ name: '', unit: defaultUnit, stock: '' });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // 2. Submit only items with non-zero quantities (or update edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingItem) {
        const res = await fetch(`${API}/items/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-tenant': tenant },
          credentials: 'include',
          body: JSON.stringify({
            name: editingItem.name,
            unit: editingItem.unit,
            reorderLevel: parseFloat(editData.reorder || 0),
            initialStock: parseFloat(editData.addStock || 0),
            type: 'RAW_MATERIAL'
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Update failed');
      } else {
        // Pick only items whose quantity is greater than zero
        const toSave = materialList
          .filter(m => parseFloat(quantities[m.id] || 0) > 0)
          .map(m => ({
            name: m.name,
            unit: m.unit,
            reorderLevel: m.defaultReorder,
            initialStock: parseFloat(quantities[m.id] || 0),
            type: 'RAW_MATERIAL'
          }));

        if (!toSave.length) throw new Error('Enter a quantity greater than zero for at least one material.');

        await Promise.all(
          toSave.map(item =>
            fetch(`${API}/items`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-tenant': tenant },
              credentials: 'include',
              body: JSON.stringify(item)
            })
          )
        );
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Items with entered quantity > 0 are automatically selected
  const activeMaterials = materialList.filter(m => parseFloat(quantities[m.id] || 0) > 0);
  const activeCount = activeMaterials.length;

  // Real-time duplicate check against preset & existing raw materials
  const trimmedCustomName = custom.name.trim();
  const isDuplicate = Boolean(
    trimmedCustomName &&
    materialList.some(m => m.name.toLowerCase() === trimmedCustomName.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[70] animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Colorful Header */}
        <div className={`px-6 py-4 flex justify-between items-center border-b shrink-0 ${
          isWadaana 
            ? 'bg-gradient-to-r from-sky-50 via-blue-50 to-white border-sky-100' 
            : 'bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl shadow-xs ${
              isWadaana ? 'bg-sky-100 text-[#0ea5e9]' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {isWadaana ? <Flame size={22} className="stroke-[2.5]" /> : <Package size={22} className="stroke-[2.5]" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {editingItem ? `Edit ${editingItem.name}` : (isWadaana ? 'Add Preforms (Set Quantities)' : 'Add Raw Materials (Set Quantities)')}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {editingItem ? 'Update reorder level and add stock.' : 'Enter quantity for any material to automatically include it.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition">
            <X size={18} />
          </button>
        </div>

        {error && <div className="mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">{error}</div>}

        {editingItem ? (
          /* EDIT SINGLE MATERIAL */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Reorder Level Alert</label>
                <input
                  type="number"
                  min="0"
                  value={editData.reorder}
                  onChange={e => setEditData(d => ({ ...d, reorder: e.target.value }))}
                  className={`w-full border border-slate-200 rounded-xl p-3 font-bold outline-none transition shadow-2xs ${
                    isWadaana ? 'focus:border-sky-500 focus:ring-1 focus:ring-sky-200' : 'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200'
                  }`}
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Add Stock ({editingItem.unit})</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={editData.addStock}
                  onChange={e => setEditData(d => ({ ...d, addStock: e.target.value }))}
                  className={`w-full border border-slate-200 rounded-xl p-3 font-bold outline-none transition shadow-2xs ${
                    isWadaana ? 'focus:border-sky-500 focus:ring-1 focus:ring-sky-200' : 'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200'
                  }`}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition">
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={saving} 
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition ${
                  isWadaana ? 'bg-sky-600 hover:bg-sky-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {saving ? 'Saving...' : 'Update Material'}
              </button>
            </div>
          </form>
        ) : (
          /* ADD MATERIALS LIST */
          <div className="p-6 space-y-4 overflow-y-auto flex-1 flex flex-col">
            {/* Colorful Custom Material Creator */}
            <div className={`p-4 rounded-xl border space-y-3 shrink-0 shadow-xs ${
              isWadaana 
                ? 'bg-gradient-to-br from-sky-50/80 via-blue-50/40 to-white border-sky-200' 
                : 'bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-white border-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  isWadaana ? 'text-sky-950' : 'text-emerald-950'
                }`}>
                  <Sparkles size={14} className="text-amber-500" />
                  New Custom Raw Material
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Direct Add</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs">
                <input
                  type="text"
                  placeholder={isWadaana ? "Name (e.g. Pure Blue Preform)" : "Name (e.g. Mineral Salt)"}
                  value={custom.name}
                  onChange={e => {
                    setError('');
                    setCustom(c => ({ ...c, name: e.target.value }));
                  }}
                  onKeyDown={e => { 
                    if (e.key === 'Enter') { 
                      e.preventDefault(); 
                      if (!isDuplicate) handleAddCustom(); 
                    } 
                  }}
                  className={`sm:col-span-4 px-3.5 py-3 bg-white border rounded-xl font-bold text-slate-900 outline-none shadow-2xs transition ${
                    isDuplicate 
                      ? 'border-rose-400 bg-rose-50/30 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-200'
                      : isWadaana 
                        ? 'border-slate-200 focus:border-[#0ea5e9] focus:ring-1 focus:ring-sky-200' 
                        : 'border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200'
                  }`}
                />
                <CustomUnitDropdown
                  value={custom.unit}
                  onChange={u => setCustom(c => ({ ...c, unit: u }))}
                  options={UNITS}
                  isWadaana={isWadaana}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Stock Qty"
                  value={custom.stock}
                  onChange={e => setCustom(c => ({ ...c, stock: e.target.value }))}
                  onKeyDown={e => { 
                    if (e.key === 'Enter') { 
                      e.preventDefault(); 
                      if (!isDuplicate) handleAddCustom(); 
                    } 
                  }}
                  className={`sm:col-span-2 px-3 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none shadow-2xs text-center transition ${
                    isWadaana ? 'focus:border-[#0ea5e9]' : 'focus:border-emerald-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleAddCustom}
                  disabled={saving || !trimmedCustomName || isDuplicate}
                  className={`sm:col-span-3 px-3 py-3 rounded-xl font-bold text-white text-xs flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    isWadaana ? 'bg-[#0ea5e9] hover:bg-sky-600' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <Plus size={15} className="stroke-[2.5]" />
                  <span>Add Custom</span>
                </button>

                {isDuplicate && (
                  <div className="sm:col-span-12 text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                    <span>⚠️ &quot;{trimmedCustomName}&quot; already exists in raw materials. Please use a different name.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Material Quantities List */}
            <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-2 overflow-y-auto max-h-64 pr-1 custom-scrollbar">
                {materialList.map(mat => {
                  const val = quantities[mat.id] || '';
                  const hasQty = parseFloat(val || 0) > 0;

                  return (
                    <div
                      key={mat.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs ${
                        hasQty 
                          ? (isWadaana 
                              ? 'bg-sky-50/80 border-sky-300 ring-1 ring-sky-200 shadow-xs' 
                              : 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-200 shadow-xs') 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Name & Badge */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className={`p-1.5 rounded-lg shrink-0 ${
                          mat.isCustom 
                            ? 'bg-amber-100 text-amber-600' 
                            : hasQty 
                              ? (isWadaana ? 'bg-sky-100 text-[#0ea5e9]' : 'bg-emerald-100 text-emerald-700') 
                              : 'bg-slate-100 text-slate-500'
                        }`}>
                          {mat.isCustom ? <Sparkles size={15} /> : isWadaana ? <Flame size={15} /> : <Package size={15} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 truncate">{mat.name}</span>
                            {mat.isCustom && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                Custom
                              </span>
                            )}
                            {hasQty && (
                              <Check size={13} className={isWadaana ? 'text-[#0ea5e9] shrink-0' : 'text-emerald-600 shrink-0'} />
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            Unit: {mat.unit}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Input with Stepper */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const current = parseFloat(quantities[mat.id] || 0);
                            const next = Math.max(0, current - 1);
                            setQuantities(q => ({ ...q, [mat.id]: next === 0 ? '' : next }));
                          }}
                          className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          value={val}
                          onChange={e => {
                            const inputVal = e.target.value;
                            setQuantities(q => ({ ...q, [mat.id]: inputVal }));
                          }}
                          className={`w-20 py-1.5 px-2 bg-white border rounded-lg text-xs font-bold text-slate-900 text-center outline-none shadow-2xs transition ${
                            hasQty 
                              ? (isWadaana ? 'border-sky-400 focus:ring-1 focus:ring-sky-300' : 'border-emerald-400 focus:ring-1 focus:ring-emerald-300') 
                              : 'border-slate-200 focus:border-slate-400'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const current = parseFloat(quantities[mat.id] || 0);
                            setQuantities(q => ({ ...q, [mat.id]: current + 1 }));
                          }}
                          className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
                <span className={`text-xs font-bold ${activeCount > 0 ? (isWadaana ? 'text-sky-600' : 'text-emerald-600') : 'text-slate-400'}`}>
                  {activeCount} material(s) ready to add
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={onClose} 
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || activeCount === 0}
                    className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isWadaana 
                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700' 
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                    }`}
                  >
                    <Check size={14} />
                    <span>Add Materials ({activeCount})</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
