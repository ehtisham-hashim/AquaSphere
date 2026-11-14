import { useState, useEffect } from 'react';
import { X, PackageCheck, Loader2, Info, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL as API } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatRawMaterialQty } from '../../utils/unitFormat';

export default function AddEditFinishedGoodModal({
  isOpen,
  onClose,
  onSaved,
  tenant = 'aquasphere',
  itemToEdit = null,
  onDeleteItem = null
}) {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('packs');
  const [packSize, setPackSize] = useState('1');
  const [reorderLevel, setReorderLevel] = useState(20);
  const [stockInputMode, setStockInputMode] = useState('packs');
  const [factoryStock, setFactoryStock] = useState('0');
  const [warehouseStock, setWarehouseStock] = useState('0');
  const [stockEdited, setStockEdited] = useState(false);
  const [recipeInputBasis, setRecipeInputBasis] = useState('PACK'); // 'PACK' | 'BOTTLE'

  // Raw materials list: array of DB items
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  // Map of rawMaterialId -> quantity string (e.g. { "id1": "12", "id2": "0.015" })
  const [materialQuantities, setMaterialQuantities] = useState({});
  const [saving, setSaving] = useState(false);

  const isShrinkMaterial = (mat) => {
    const n = (mat?.name || '').toLowerCase();
    return n.includes('shrink') || n.includes('wrap') || n.includes('film');
  };

  // Fetch available raw materials and populate itemToEdit when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchRawMaterialsAndPopulate = async () => {
      setLoadingMaterials(true);
      setStockEdited(false);
      setRecipeInputBasis('PACK');
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
          const pSize = Math.max(1, Number(itemToEdit.packSize || 1));
          const rawUnit = String(itemToEdit.unit || '').toLowerCase();
          const normalizedUnit = rawUnit === 'litres'
            ? 'litres'
            : rawUnit === 'pcs'
              ? 'pcs'
              : (pSize > 1 ? 'packs' : 'bottles');
          setUnit(normalizedUnit);
          setPackSize(String(pSize));
          setReorderLevel(Number(itemToEdit.reorderLevel || 0));

          const fac = Number(itemToEdit.factoryQty || 0);
          const wh = Number(itemToEdit.warehouseQty || 0);
          const cached = Number(itemToEdit.cachedQty || 0);
          const effectiveFac = (fac === 0 && wh === 0 && cached > 0) ? cached : fac;
          const effectiveWh = (fac === 0 && wh === 0 && cached > 0) ? 0 : wh;

          const hasLooseBottles = pSize > 1 && (effectiveFac % pSize !== 0 || effectiveWh % pSize !== 0);
          if (pSize > 1 && !hasLooseBottles) {
            setStockInputMode('packs');
            setFactoryStock(String(effectiveFac / pSize));
            setWarehouseStock(String(effectiveWh / pSize));
          } else {
            setStockInputMode('bottles');
            setFactoryStock(String(effectiveFac));
            setWarehouseStock(String(effectiveWh));
          }

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
          setPackSize('1');
          setReorderLevel(20);
          setStockInputMode('packs');
          setFactoryStock('0');
          setWarehouseStock('0');
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

  const parsedPackSize = Math.max(1, parseInt(packSize, 10) || 1);

  const handlePackSizeChange = (newVal) => {
    setPackSize(newVal);
    const rawInt = parseInt(newVal, 10);
    const nextPSize = Math.max(1, rawInt || 1);
    if (newVal !== '' && !isNaN(rawInt) && rawInt <= 1 && recipeInputBasis !== 'PACK') {
      // Switching packSize down to 1: convert any BOTTLE-mode inputs safely
      setRecipeInputBasis('PACK');
    }
    if (itemToEdit && !stockEdited && stockInputMode === 'packs') {
      const fac = Number(itemToEdit.factoryQty || 0);
      const wh = Number(itemToEdit.warehouseQty || 0);
      const cached = Number(itemToEdit.cachedQty || 0);
      const effectiveFac = (fac === 0 && wh === 0 && cached > 0) ? cached : fac;
      const effectiveWh = (fac === 0 && wh === 0 && cached > 0) ? 0 : wh;
      setFactoryStock(String(Number((effectiveFac / nextPSize).toFixed(4))));
      setWarehouseStock(String(Number((effectiveWh / nextPSize).toFixed(4))));
    }
  };

  const handleStockModeSwitch = (newMode) => {
    if (newMode === stockInputMode) return;
    const curFac = parseFloat(factoryStock) || 0;
    const curWh = parseFloat(warehouseStock) || 0;
    if (newMode === 'bottles' && stockInputMode === 'packs') {
      setFactoryStock(String(Math.round(curFac * parsedPackSize)));
      setWarehouseStock(String(Math.round(curWh * parsedPackSize)));
    } else if (newMode === 'packs' && stockInputMode === 'bottles') {
      setFactoryStock(String(Number((curFac / parsedPackSize).toFixed(4))));
      setWarehouseStock(String(Number((curWh / parsedPackSize).toFixed(4))));
    }
    setStockInputMode(newMode);
  };

  const handleRecipeBasisSwitch = (nextBasis) => {
    if (nextBasis === recipeInputBasis || parsedPackSize <= 1) return;
    setMaterialQuantities(prev => {
      const next = { ...prev };
      for (const mat of rawMaterials) {
        if (isShrinkMaterial(mat)) continue;
        const val = parseFloat(prev[mat.id]);
        if (!isNaN(val) && val > 0) {
          const converted = nextBasis === 'BOTTLE'
            ? val / parsedPackSize
            : val * parsedPackSize;
          next[mat.id] = String(Number(converted.toFixed(6)));
        }
      }
      return next;
    });
    setRecipeInputBasis(nextBasis);
  };

  const handleQtyChange = (rmId, value) => {
    setMaterialQuantities(prev => ({
      ...prev,
      [rmId]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Product name is required');

    // Build canonical per-selling-unit recipe payload (1 Pack when packSize > 1, 1 Bottle when packSize === 1)
    const rmById = new Map(rawMaterials.map(m => [m.id, m]));
    const validRecipe = [];
    for (const [rmId, qtyStr] of Object.entries(materialQuantities)) {
      const q = parseFloat(qtyStr);
      if (!isNaN(q) && q > 0) {
        const mat = rmById.get(rmId);
        const shouldScaleFromBottle = recipeInputBasis === 'BOTTLE' && parsedPackSize > 1 && !isShrinkMaterial(mat);
        const canonicalQty = shouldScaleFromBottle ? Number((q * parsedPackSize).toFixed(8)) : q;
        validRecipe.push({
          rawMaterialId: rmId,
          quantityPerUnit: canonicalQty
        });
      }
    }

    setSaving(true);
    try {
      const packMultiplier = (stockInputMode === 'packs' && parsedPackSize > 1) ? parsedPackSize : 1;
      const effectiveFactoryStock = (parseFloat(factoryStock) || 0) * packMultiplier;
      const effectiveWarehouseStock = (parseFloat(warehouseStock) || 0) * packMultiplier;

      const payload = {
        name: name.trim(),
        type: 'FINISHED_GOOD',
        unit: unit.trim() || (parsedPackSize > 1 ? 'packs' : 'bottles'),
        packSize: parsedPackSize,
        reorderLevel: parseFloat(reorderLevel) || 0,
        recipe: validRecipe
      };

      if (!itemToEdit || stockEdited) {
        payload.factoryStock = effectiveFactoryStock;
        payload.warehouseStock = effectiveWarehouseStock;
      }

      const url = itemToEdit ? `${API}/items/${itemToEdit.id}` : `${API}/items`;
      const method = itemToEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        credentials: 'include',
        body: JSON.stringify(payload)
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

  const totalCalculatedStock = (Math.max(0, parseFloat(factoryStock) || 0) + Math.max(0, parseFloat(warehouseStock) || 0));

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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pack Size (Bottles/Pack)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1 (Single bottle) or 12"
                  value={packSize}
                  onChange={(e) => handlePackSizeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reorder Level (Alert)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Location Stock Breakdown (Factory & Warehouse) & Live Total */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {itemToEdit ? 'Adjust Stock by Location' : 'Initial Stock by Location'}
                    </h5>
                    {parsedPackSize > 1 && (
                      <div className="inline-flex rounded-lg p-0.5 bg-slate-200/80 border border-slate-300 text-[10px]">
                        <button
                          type="button"
                          onClick={() => handleStockModeSwitch('packs')}
                          className={`px-2 py-0.5 rounded-md font-bold transition ${
                            stockInputMode === 'packs'
                              ? 'bg-white text-brand shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Packs (x{parsedPackSize})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStockModeSwitch('bottles')}
                          className={`px-2 py-0.5 rounded-md font-bold transition ${
                            stockInputMode === 'bottles'
                              ? 'bg-white text-brand shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Base Bottles
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {itemToEdit 
                      ? 'Update factory and warehouse balances directly. Leave untouched if only editing recipe.' 
                      : 'Assign opening stock to factory and warehouse locations.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Available</span>
                    <span className="text-sm font-mono font-black text-brand">
                      {totalCalculatedStock.toLocaleString()}{' '}
                      <span className="text-[11px] font-normal text-slate-500">
                        {parsedPackSize > 1 && stockInputMode === 'packs' ? 'Packs' : unit}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>🏭 Factory Stock ({parsedPackSize > 1 && stockInputMode === 'packs' ? 'Packs' : unit})</span>
                    {itemToEdit && (
                      <span className="text-[10px] text-slate-400 font-normal">
                        Prev:{' '}
                        {parsedPackSize > 1 && stockInputMode === 'packs'
                          ? `${(Number(itemToEdit.factoryQty || 0) / parsedPackSize).toFixed(1).replace(/\.0$/, '')} pk`
                          : Number(itemToEdit.factoryQty || 0).toLocaleString()}
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={factoryStock}
                    onChange={(e) => {
                      setFactoryStock(e.target.value);
                      setStockEdited(true);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>🏢 Warehouse Stock ({parsedPackSize > 1 && stockInputMode === 'packs' ? 'Packs' : unit})</span>
                    {itemToEdit && (
                      <span className="text-[10px] text-slate-400 font-normal">
                        Prev:{' '}
                        {parsedPackSize > 1 && stockInputMode === 'packs'
                          ? `${(Number(itemToEdit.warehouseQty || 0) / parsedPackSize).toFixed(1).replace(/\.0$/, '')} pk`
                          : Number(itemToEdit.warehouseQty || 0).toLocaleString()}
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={warehouseStock}
                    onChange={(e) => {
                      setWarehouseStock(e.target.value);
                      setStockEdited(true);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bill of Materials (Pre-populated list of all raw materials) */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Recipe Consumption ({parsedPackSize > 1 && recipeInputBasis === 'BOTTLE' ? 'Per 1 Bottle' : `Per 1 ${unit || 'unit'}`})
                </h4>
                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <Info size={12} className="text-sky-500 shrink-0" />
                  {parsedPackSize > 1 && recipeInputBasis === 'BOTTLE'
                    ? `Enter per-bottle raw materials (auto-scaled ×${parsedPackSize} to pack recipe on save; Shrink Wrap stays Per 1 Pack).`
                    : `Enter raw materials needed to produce 1 ${unit || 'unit'} (e.g. bottles, caps, shrink wrap, labels).`}
                </p>
              </div>
              {parsedPackSize > 1 && (
                <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 text-[10px] shrink-0 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleRecipeBasisSwitch('PACK')}
                    className={`px-2 py-1 rounded-md font-bold transition cursor-pointer ${
                      recipeInputBasis === 'PACK'
                        ? 'bg-white text-brand shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Per 1 Pack (x{parsedPackSize})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRecipeBasisSwitch('BOTTLE')}
                    className={`px-2 py-1 rounded-md font-bold transition cursor-pointer ${
                      recipeInputBasis === 'BOTTLE'
                        ? 'bg-white text-brand shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Per 1 Bottle
                  </button>
                </div>
              )}
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
                  <div className="col-span-7 sm:col-span-7">Raw Material</div>
                  <div className="hidden sm:block sm:col-span-2 text-right">In Stock</div>
                  <div className="col-span-5 sm:col-span-3 text-right">
                    {parsedPackSize > 1 && recipeInputBasis === 'BOTTLE' ? 'Per 1 Btl' : `Per ${unit || 'Unit'}`}
                  </div>
                </div>

                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {rawMaterials.map((mat) => {
                    const currentVal = materialQuantities[mat.id] || '';
                    const isIncluded = parseFloat(currentVal) > 0;
                    const isShrink = isShrinkMaterial(mat);
                    const showPackHint = isIncluded && parsedPackSize > 1 && recipeInputBasis === 'BOTTLE' && !isShrink;

                    return (
                      <div
                        key={mat.id}
                        className={`grid grid-cols-12 items-center px-3 py-2 text-xs transition-colors ${
                          isIncluded ? 'bg-sky-50/50' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="col-span-7 sm:col-span-7 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 min-w-0 pr-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isIncluded ? 'bg-sky-500 ring-2 ring-sky-200' : 'bg-slate-200'
                              }`}
                            />
                            <span className={`font-medium truncate ${isIncluded ? 'text-slate-900 font-bold' : 'text-slate-700'}`}>
                              {mat.name}
                            </span>
                            {parsedPackSize > 1 && isShrink && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                                Per 1 Pack
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono sm:hidden ml-4">
                            Stock: {formatRawMaterialQty(mat.cachedQty, mat.unit)}
                          </span>
                          {showPackHint && (
                            <span className="text-[10px] font-mono text-sky-700 shrink-0 ml-4 sm:ml-0">
                              = {Number((parseFloat(currentVal) * parsedPackSize).toFixed(4))}/pk
                            </span>
                          )}
                        </div>

                        <div className="hidden sm:block sm:col-span-2 text-right font-mono text-slate-500 text-[11px]">
                          {formatRawMaterialQty(mat.cachedQty, mat.unit)}
                        </div>

                        <div className="col-span-5 sm:col-span-3 flex items-center justify-end gap-1.5 pl-2">
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
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
            {itemToEdit && isOwner && onDeleteItem ? (
              <button
                type="button"
                onClick={() => {
                  onDeleteItem(itemToEdit);
                  onClose();
                }}
                disabled={saving}
                className="btn-danger text-xs py-2 px-3 flex items-center gap-1.5"
              >
                <Trash2 size={13} /> Delete Item
              </button>
            ) : <div />}
            <div className="flex items-center gap-2">
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
          </div>
        </form>
      </div>
    </div>
  );
}
