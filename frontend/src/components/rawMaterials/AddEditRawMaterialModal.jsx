import { useState, useEffect, useMemo } from 'react';
import { X, Package, Flame, Check, Minus, Plus, Search, CheckSquare, Square } from 'lucide-react';
import { API_URL as API } from '../../utils/api';

const AQUASPHERE_PRESETS = [
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
];

const WADAANA_PRESETS = [
  { id: 'pure_05l_15g', name: 'Pure Preform (0.5L - 15g)', unit: 'kg', defaultReorder: 100 },
  { id: 'pure_15l_30g', name: 'Pure Preform (1.5L - 30g)', unit: 'kg', defaultReorder: 100 },
  { id: 'mix_05l_13g', name: 'Mix Preform (0.5L - 13g)', unit: 'kg', defaultReorder: 100 },
  { id: 'mix_15l_27g', name: 'Mix Preform (1.5L - 27g)', unit: 'kg', defaultReorder: 100 }
];

export default function AddEditRawMaterialModal({ 
  isOpen, 
  onClose, 
  onSaved, 
  editingItem = null, 
  existingMaterials = [],
  tenant = 'aquasphere' 
}) {
  const isWadaana = tenant === 'wadaana';
  const basePresets = isWadaana ? WADAANA_PRESETS : AQUASPHERE_PRESETS;

  // Merge presets with existing database materials to ensure everything in DB is available
  const presetsList = useMemo(() => {
    const list = [...basePresets];
    existingMaterials.forEach(m => {
      if (m.type === 'RAW_MATERIAL' && !m.archivedAt) {
        const alreadyInList = list.some(p => p.name.toLowerCase() === m.name.toLowerCase());
        if (!alreadyInList) {
          list.push({
            id: m.id,
            name: m.name,
            unit: m.unit || 'pcs',
            defaultReorder: parseFloat(m.reorderLevel || 100)
          });
        }
      }
    });
    return list;
  }, [basePresets, existingMaterials]);

  // Search filter inside modal
  const [filterSearch, setFilterSearch] = useState('');

  // Selected preset items map: { presetId: { checked: boolean, qty: number|string, reorderLevel: number|string } }
  const [selectedItems, setSelectedItems] = useState({});

  // Custom new material state
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customItem, setCustomItem] = useState({ name: '', unit: 'pcs', qty: '', reorderLevel: 100 });

  // Single Item Edit Form State (when editing existing item from table)
  const [editFormData, setEditFormData] = useState({
    name: '',
    unit: 'pcs',
    reorderLevel: 100,
    addStock: ''
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Initialize selection state on open
  useEffect(() => {
    if (!isOpen) return;

    if (editingItem) {
      setEditFormData({
        name: editingItem.name || '',
        unit: editingItem.unit || (isWadaana ? 'kg' : 'pcs'),
        reorderLevel: parseFloat(editingItem.reorderLevel || 0),
        addStock: ''
      });
    } else {
      const initialMap = {};
      presetsList.forEach(p => {
        initialMap[p.id] = {
          checked: false,
          qty: '',
          reorderLevel: p.defaultReorder
        };
      });
      setSelectedItems(initialMap);
      setFilterSearch('');
      setShowCustomForm(false);
      setCustomItem({ name: '', unit: isWadaana ? 'kg' : 'pcs', qty: '', reorderLevel: 100 });
    }
    setError('');
  }, [isOpen, editingItem, isWadaana, presetsList]);

  if (!isOpen) return null;

  // Toggle single item selection
  const handleToggleItem = (presetId) => {
    setSelectedItems(prev => ({
      ...prev,
      [presetId]: {
        ...prev[presetId],
        checked: !prev[presetId]?.checked
      }
    }));
  };

  // Change quantity for preset
  const handleQtyChange = (presetId, val) => {
    setSelectedItems(prev => ({
      ...prev,
      [presetId]: {
        ...prev[presetId],
        qty: val,
        checked: true // Auto-check when quantity entered
      }
    }));
  };

  // Change reorder level for preset
  const handleReorderChange = (presetId, val) => {
    setSelectedItems(prev => ({
      ...prev,
      [presetId]: {
        ...prev[presetId],
        reorderLevel: val
      }
    }));
  };

  // Select / Deselect All
  const handleSelectAll = (select) => {
    const nextMap = {};
    presetsList.forEach(p => {
      nextMap[p.id] = {
        checked: select,
        qty: selectedItems[p.id]?.qty || '',
        reorderLevel: selectedItems[p.id]?.reorderLevel || p.defaultReorder
      };
    });
    setSelectedItems(nextMap);
  };

  // Filtered presets by search
  const visiblePresets = presetsList.filter(p => 
    p.name.toLowerCase().includes(filterSearch.toLowerCase())
  );

  const selectedCount = Object.values(selectedItems).filter(item => item.checked).length;

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingItem) {
        // Edit single item
        const res = await fetch(`${API}/items/${editingItem.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'x-tenant': tenant
          },
          credentials: 'include',
          body: JSON.stringify({
            name: editFormData.name,
            unit: editFormData.unit,
            reorderLevel: parseFloat(editFormData.reorderLevel || 0),
            initialStock: parseFloat(editFormData.addStock || 0),
            type: 'RAW_MATERIAL'
          })
        });

        const json = await res.json();
        if (!json.success && !res.ok) {
          setError(json.message || 'Error updating material');
          return;
        }
      } else {
        // Multi-add selected presets
        const itemsToSave = presetsList
          .filter(p => selectedItems[p.id]?.checked)
          .map(p => ({
            name: p.name,
            unit: p.unit,
            reorderLevel: parseFloat(selectedItems[p.id]?.reorderLevel || p.defaultReorder),
            initialStock: parseFloat(selectedItems[p.id]?.qty || 0),
            type: 'RAW_MATERIAL'
          }));

        // Include custom material if entered
        if (customItem.name.trim()) {
          itemsToSave.push({
            name: customItem.name.trim(),
            unit: customItem.unit || 'pcs',
            reorderLevel: parseFloat(customItem.reorderLevel || 0),
            initialStock: parseFloat(customItem.qty || 0),
            type: 'RAW_MATERIAL'
          });
        }

        if (itemsToSave.length === 0) {
          setError('Please check at least one raw material or enter a custom material to add.');
          setSaving(false);
          return;
        }

        // Save all selected materials in parallel
        const savePromises = itemsToSave.map(item =>
          fetch(`${API}/items`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-tenant': tenant
            },
            credentials: 'include',
            body: JSON.stringify(item)
          }).then(res => res.json())
        );

        const results = await Promise.all(savePromises);
        const failed = results.find(r => !r.success);
        if (failed) {
          setError(failed.message || 'Failed to save some raw materials');
          setSaving(false);
          return;
        }
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Network error saving raw materials');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[70] animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className={`px-6 py-4 flex justify-between items-center border-b border-slate-100 shrink-0 ${
          isWadaana ? 'bg-sky-50/70' : 'bg-emerald-50/70'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isWadaana ? 'bg-sky-100 text-[#0ea5e9]' : 'bg-emerald-100 text-emerald-700'}`}>
              {isWadaana ? <Flame size={20} /> : <Package size={20} />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {editingItem ? 'Edit Raw Material' : (isWadaana ? 'Add Preforms (Select & Set Quantity)' : 'Add Raw Materials (Select & Set Quantity)')}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {editingItem ? 'Update reorder level and add stock.' : 'Select raw materials via checkboxes or add custom materials with stock quantity.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {error && (
            <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
              {error}
            </div>
          )}

          {/* EDIT SINGLE ITEM MODE */}
          {editingItem ? (
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Material Name</label>
                <input
                  className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 text-slate-800 text-sm font-bold cursor-not-allowed"
                  value={editFormData.name}
                  disabled
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Measurement Unit</label>
                  <input
                    className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 text-slate-800 text-sm font-semibold uppercase cursor-not-allowed"
                    value={editFormData.unit}
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Reorder Level Alert</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition shadow-2xs"
                    value={editFormData.reorderLevel}
                    onChange={(e) => setEditFormData({ ...editFormData, reorderLevel: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1.5">
                <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  Add Stock Quantity ({editFormData.unit})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full border border-slate-200 rounded-xl p-3 bg-white text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 shadow-2xs"
                    value={editFormData.addStock}
                    onChange={(e) => setEditFormData({ ...editFormData, addStock: e.target.value })}
                    placeholder={`Current stock: ${editingItem.cachedQty || 0} ${editFormData.unit}`}
                  />
                  <span className="px-3 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-500 uppercase">
                    {editFormData.unit}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* MULTI-ITEM PRESET CHECKBOX SELECTION MODE */
            <div className="flex flex-col flex-1 overflow-hidden p-6 space-y-4">
              {/* Search & Action Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 shrink-0">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search raw materials..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 transition shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(!showCustomForm)}
                    className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 border ${
                      showCustomForm ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Plus size={13} /> {showCustomForm ? 'Close Custom' : '+ Custom Item'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition flex items-center gap-1"
                  >
                    <CheckSquare size={13} /> Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition flex items-center gap-1"
                  >
                    <Square size={13} /> Deselect
                  </button>
                </div>
              </div>

              {/* Collapsible Custom Raw Material Creator */}
              {showCustomForm && (
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3 shrink-0 animate-in fade-in duration-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">New Custom Raw Material</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Material Name (e.g. Mineral Salt)"
                      value={customItem.name}
                      onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })}
                      className="sm:col-span-2 p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 outline-none focus:border-emerald-500"
                    />
                    <select
                      value={customItem.unit}
                      onChange={(e) => setCustomItem({ ...customItem, unit: e.target.value })}
                      className="p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 outline-none focus:border-emerald-500"
                    >
                      <option value="pcs">pcs</option>
                      <option value="kg">kg</option>
                      <option value="rolls">rolls</option>
                      <option value="bottles">bottles</option>
                      <option value="packs">packs</option>
                      <option value="bags">bags</option>
                      <option value="litres">litres</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Initial Stock Qty"
                      value={customItem.qty}
                      onChange={(e) => setCustomItem({ ...customItem, qty: e.target.value })}
                      className="p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Checkbox Presets List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {visiblePresets.map(preset => {
                  const isChecked = !!selectedItems[preset.id]?.checked;
                  const itemData = selectedItems[preset.id] || { qty: '', reorderLevel: preset.defaultReorder };

                  return (
                    <div
                      key={preset.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isChecked 
                          ? (isWadaana ? 'bg-sky-50/60 border-sky-300 shadow-2xs' : 'bg-emerald-50/60 border-emerald-300 shadow-2xs') 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Checkbox + Material Name */}
                      <label className="flex items-center gap-3 cursor-pointer select-none min-w-[200px]">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleItem(preset.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                        />
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{preset.name}</div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                            {preset.unit}
                          </span>
                        </div>
                      </label>

                      {/* Controls: Quantity to Add & Reorder Level */}
                      <div className="flex items-center gap-3 sm:justify-end">
                        {/* Quantity Input with Stepper */}
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold uppercase text-slate-400 mb-0.5">Qty to Add ({preset.unit})</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const current = parseFloat(itemData.qty || 0);
                                const next = Math.max(0, current - 1);
                                handleQtyChange(preset.id, next === 0 ? '' : next);
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition"
                            >
                              <Minus size={12} />
                            </button>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0"
                              value={itemData.qty}
                              onChange={(e) => handleQtyChange(preset.id, e.target.value)}
                              className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-bold text-center text-slate-900 outline-none focus:border-emerald-500 shadow-2xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const current = parseFloat(itemData.qty || 0);
                                handleQtyChange(preset.id, current + 1);
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Reorder Level Input */}
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold uppercase text-slate-400 mb-0.5">Reorder Level</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={itemData.reorderLevel}
                            onChange={(e) => handleReorderChange(preset.id, e.target.value)}
                            className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold text-center text-slate-700 outline-none focus:border-emerald-500 shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-slate-500">
              {!editingItem && `${selectedCount} material(s) checked`}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200/60 rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || (!editingItem && selectedCount === 0)}
                className={`px-5 py-2 rounded-xl font-bold text-white text-xs transition-all shadow-2xs flex items-center gap-1.5 disabled:opacity-50 ${
                  isWadaana ? 'bg-sky-600 hover:bg-sky-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {saving ? (
                  'Saving...'
                ) : editingItem ? (
                  'Update Material'
                ) : (
                  <>
                    <Check size={14} /> Add Selected Materials ({selectedCount})
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
