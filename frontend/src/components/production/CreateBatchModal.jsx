import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Plus, Trash2, Sparkles, Package, Flame, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateBatchModal({
  isOpen,
  onClose,
  onSubmit,
  isWadaana,
  items = [],
  batchesCount = 0,
  submitting = false
}) {
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Mode: standard vs custom product & raw materials
  const [useCustomBatch, setUseCustomBatch] = useState(false);

  // Standard AquaSphere fields
  const [packs05L, setPacks05L] = useState('');
  const [packs15L, setPacks15L] = useState('');
  const [quantity, setQuantity] = useState('');

  // Standard Wadaana fields
  const [qtyPure05L, setQtyPure05L] = useState('');
  const [qtyPure15L, setQtyPure15L] = useState('');
  const [qtyMix05L, setQtyMix05L] = useState('');
  const [qtyMix15L, setQtyMix15L] = useState('');

  // Custom Batch fields
  const [customProductName, setCustomProductName] = useState('');
  const [customBatchQty, setCustomBatchQty] = useState('');
  const [consumedMaterials, setConsumedMaterials] = useState([]);

  // Separation of items by type
  const rawMaterials = useMemo(
    () => items.filter(i => i.type === 'RAW_MATERIAL' && !i.archivedAt),
    [items]
  );
  const finishedGoods = useMemo(
    () => items.filter(i => i.type === 'FINISHED_GOOD' && !i.archivedAt),
    [items]
  );

  const rawMaterialsRef = useRef(rawMaterials);
  useEffect(() => {
    rawMaterialsRef.current = rawMaterials;
  }, [rawMaterials]);

  // Reset internal form state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      setBatchDate(localDate);
      setNotes('');
      setPacks05L('');
      setPacks15L('');
      setQuantity('');
      setQtyPure05L('');
      setQtyPure15L('');
      setQtyMix05L('');
      setQtyMix15L('');
      setCustomProductName('');
      setCustomBatchQty('');
      const currentRawMaterials = rawMaterialsRef.current || [];
      setConsumedMaterials(
        currentRawMaterials.length > 0
          ? [{ rawMaterialId: currentRawMaterials[0].id, quantityPerUnit: isWadaana ? '0.015' : '1' }]
          : []
      );
    }
  }, [isOpen, isWadaana]);

  if (!isOpen) return null;

  // Add a new raw material row to custom batch
  const handleAddRawMaterialRow = () => {
    if (rawMaterials.length === 0) {
      toast.error('No raw materials available to add');
      return;
    }
    setConsumedMaterials(prev => [
      ...prev,
      { rawMaterialId: rawMaterials[0].id, quantityPerUnit: isWadaana ? '0.015' : '1' }
    ]);
  };

  // Remove a raw material row
  const handleRemoveRawMaterialRow = (index) => {
    setConsumedMaterials(prev => prev.filter((_, i) => i !== index));
  };

  // Update a raw material row
  const handleUpdateRawMaterialRow = (index, field, value) => {
    setConsumedMaterials(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // When user selects an existing finished good from quick selector
  const handleSelectExistingFg = (fgId) => {
    if (!fgId) {
      setCustomProductName('');
      return;
    }
    const fg = finishedGoods.find(f => f.id === fgId);
    if (fg) {
      setCustomProductName(fg.name);
      if (fg.recipeFinishedGoods && fg.recipeFinishedGoods.length > 0) {
        setConsumedMaterials(
          fg.recipeFinishedGoods.map(r => ({
            rawMaterialId: r.rawMaterialId,
            quantityPerUnit: String(r.quantityPerUnit)
          }))
        );
      }
    }
  };

  const numQty = parseFloat(customBatchQty) || 0;

  // Live calculation of BOM requirements for custom batch
  const bomRequirements = consumedMaterials.map(cm => {
    const rawMat = rawMaterials.find(rm => rm.id === cm.rawMaterialId);
    const perUnit = parseFloat(cm.quantityPerUnit) || 0;
    const required = numQty * perUnit;
    const available = Number(rawMat?.cachedQty || 0);
    const isShort = required > 0 && available < required;
    return {
      id: cm.rawMaterialId,
      name: rawMat?.name || 'Unknown Material',
      unit: rawMat?.unit || 'pcs',
      perUnit,
      required,
      available,
      isShort
    };
  });
  const hasBomShortage = bomRequirements.some(b => b.isShort);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (useCustomBatch) {
      const name = customProductName.trim();
      if (!name) {
        toast.error('Please enter the custom product / finished good name');
        return;
      }
      const q = parseInt(customBatchQty || 0, 10);
      if (q <= 0) {
        toast.error('Please enter a valid quantity to produce greater than 0');
        return;
      }
      if (consumedMaterials.length === 0) {
        toast.error('Please select at least one raw material consumed by this product');
        return;
      }
      for (const cm of consumedMaterials) {
        if (!cm.rawMaterialId) {
          toast.error('Please select a valid raw material for all rows');
          return;
        }
        if (parseFloat(cm.quantityPerUnit || 0) <= 0) {
          toast.error('Raw material usage per unit must be greater than 0');
          return;
        }
      }

      onSubmit({
        customProductName: name,
        quantity: q,
        rawMaterials: consumedMaterials.map(cm => ({
          rawMaterialId: cm.rawMaterialId,
          quantityPerUnit: parseFloat(cm.quantityPerUnit)
        })),
        batchDate,
        notes
      });
      return;
    }

    if (isWadaana) {
      const p05 = parseInt(qtyPure05L || 0, 10);
      const p15 = parseInt(qtyPure15L || 0, 10);
      const m05 = parseInt(qtyMix05L || 0, 10);
      const m15 = parseInt(qtyMix15L || 0, 10);

      if (p05 === 0 && p15 === 0 && m05 === 0 && m15 === 0) {
        toast.error('Please enter at least one bottle quantity to produce');
        return;
      }
      onSubmit({ batchDate, notes, qtyPure05L: p05, qtyPure15L: p15, qtyMix05L: m05, qtyMix15L: m15 });
    } else {
      const p05 = parseInt(packs05L || 0, 10);
      const p15 = parseInt(packs15L || 0, 10);
      const qty = parseInt(quantity || 0, 10);

      if (p05 === 0 && p15 === 0 && qty === 0) {
        toast.error('Please enter at least one pack or 19L bottle quantity');
        return;
      }
      onSubmit({ batchDate, notes, packs05L: p05, packs15L: p15, quantity: qty });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-slate-100 flex flex-col">
        {/* Header */}
        <div className={`px-6 py-4 flex justify-between items-center z-10 shrink-0 ${
          isWadaana 
            ? 'bg-gradient-to-r from-sky-600 to-blue-700 text-white' 
            : 'bg-gradient-to-r from-slate-900 to-slate-800 text-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-xs">
              {isWadaana ? <Flame size={22} className="text-white" /> : <Package size={22} className="text-emerald-400" />}
            </div>
            <div>
              <h3 className="text-lg font-bold">Record Factory Production Batch</h3>
              <p className="text-xs text-slate-200">
                {isWadaana 
                  ? 'Enter bottle counts or custom recipe. Recorded batches are locked for audit verification.' 
                  : 'Enter pack/bottle counts or custom recipe. Recorded batches are locked for audit verification.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 flex flex-col overflow-y-auto">
          {/* Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Production Date</label>
              <input
                type="date"
                value={batchDate}
                onChange={e => setBatchDate(e.target.value)}
                className={`w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none transition shadow-2xs ${
                  isWadaana ? 'focus:border-sky-500 focus:ring-1 focus:ring-sky-200' : 'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200'
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Auto Batch Number</label>
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-mono font-black text-slate-700 flex items-center justify-between shadow-2xs">
                <span>{isWadaana ? 'WB' : 'AQ'}-{batchDate ? batchDate.replace(/-/g, '') : 'YYYYMMDD'}-{String(batchesCount + 1).padStart(3, '0')}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-200/70 px-2 py-0.5 rounded">Read-Only</span>
              </div>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setUseCustomBatch(false)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                !useCustomBatch 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {isWadaana ? 'Standard Wadaana Bottles' : 'Standard AquaSphere Packs'}
            </button>
            <button
              type="button"
              onClick={() => setUseCustomBatch(true)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                useCustomBatch 
                  ? (isWadaana ? 'bg-sky-600 text-white shadow-sm' : 'bg-emerald-600 text-white shadow-sm') 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles size={14} />
              <span>Custom Production Batch</span>
            </button>
          </div>

          {/* TAB 1: CUSTOM BATCH BUILDER */}
          {useCustomBatch ? (
            <div className={`p-5 rounded-2xl border space-y-5 shadow-xs ${
              isWadaana ? 'bg-sky-50/40 border-sky-200' : 'bg-emerald-50/40 border-emerald-200'
            }`}>
              {/* Product Name & Quantity Header */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-7">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Custom Finished Good Name
                    </label>
                    {finishedGoods.length > 0 && (
                      <select
                        onChange={(e) => handleSelectExistingFg(e.target.value)}
                        className="text-[11px] font-bold text-sky-700 bg-transparent border-none outline-none cursor-pointer hover:underline"
                        defaultValue=""
                      >
                        <option value="">(Or pick existing product...)</option>
                        {finishedGoods.map(fg => (
                          <option key={fg.id} value={fg.id}>{fg.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={isWadaana ? "e.g. Pure Blue 0.5L Bottle" : "e.g. Special 0.5L PET Pack"}
                    value={customProductName}
                    onChange={(e) => setCustomProductName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 bg-white shadow-2xs outline-none focus:border-sky-500"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Quantity to Produce ({isWadaana ? 'Bottles' : 'Packs / Bottles'})
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 5000"
                    value={customBatchQty}
                    onChange={(e) => setCustomBatchQty(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 bg-white shadow-2xs outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Consumed Raw Materials Section */}
              <div className="space-y-3 pt-2 border-t border-slate-200/70">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <span>Consumed Raw Materials (Recipe)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Select which raw materials are used to blow/make this product.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRawMaterialRow}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1 shadow-sm transition ${
                      isWadaana ? 'bg-[#0ea5e9] hover:bg-sky-600' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    <Plus size={14} />
                    <span>Add Raw Material</span>
                  </button>
                </div>

                {consumedMaterials.length === 0 ? (
                  <div className="p-4 bg-white/70 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500 font-medium">
                    No raw materials selected. Click <strong>&quot;+ Add Raw Material&quot;</strong> above to pick preforms, caps, or materials.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {consumedMaterials.map((cm, idx) => {
                      const selectedRm = rawMaterials.find(rm => rm.id === cm.rawMaterialId);
                      const unit = selectedRm?.unit || 'kg';
                      const perUnit = parseFloat(cm.quantityPerUnit || 0);
                      const totalNeeded = numQty * perUnit;
                      const inStock = selectedRm?.cachedQty || 0;
                      const isShort = totalNeeded > 0 && inStock < totalNeeded;

                      return (
                        <div
                          key={idx}
                          className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs"
                        >
                          {/* Raw Material Select Dropdown */}
                          <div className="flex-1 min-w-[200px]">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                              Raw Material
                            </label>
                            <select
                              value={cm.rawMaterialId}
                              onChange={(e) => handleUpdateRawMaterialRow(idx, 'rawMaterialId', e.target.value)}
                              className="w-full border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 bg-white outline-none focus:border-sky-500"
                            >
                              {rawMaterials.map(rm => (
                                <option key={rm.id} value={rm.id}>
                                  {rm.name} (Stock: {rm.cachedQty || 0} {rm.unit})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Usage per Output Bottle/Unit */}
                          <div className="w-full sm:w-48">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                              Used per {isWadaana ? 'Bottle' : 'Unit'} ({unit})
                            </label>
                            <input
                              type="number"
                              step="0.0001"
                              min="0.0001"
                              required
                              placeholder={isWadaana ? "e.g. 0.015" : "e.g. 1"}
                              value={cm.quantityPerUnit}
                              onChange={(e) => handleUpdateRawMaterialRow(idx, 'quantityPerUnit', e.target.value)}
                              className="w-full border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-900 bg-white outline-none focus:border-sky-500"
                            />
                          </div>

                          {/* Total Consumption & Stock Info */}
                          <div className="sm:w-48 text-right flex flex-col justify-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              Total Needed
                            </span>
                            <span className="text-xs font-black text-slate-800">
                              {totalNeeded.toLocaleString()} {unit}
                            </span>
                            <span className={`text-[10px] font-bold flex items-center justify-end gap-1 mt-0.5 ${
                              isShort ? 'text-rose-600' : 'text-emerald-600'
                            }`}>
                              {isShort ? <AlertCircle size={11} /> : <CheckCircle2 size={11} />}
                              {isShort ? `Short by ${(totalNeeded - inStock).toLocaleString()} ${unit}` : `In Stock: ${inStock} ${unit}`}
                            </span>
                          </div>

                          {/* Remove Button */}
                          {consumedMaterials.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRawMaterialRow(idx)}
                              title="Remove raw material"
                              className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition shrink-0"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Overall BOM Stock Notice */}
              {numQty > 0 && bomRequirements.length > 0 && (
                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                  hasBomShortage 
                    ? 'bg-rose-50 border-rose-200 text-rose-800' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <div className="flex items-center gap-2">
                    {hasBomShortage ? <AlertCircle size={16} className="text-rose-600 shrink-0" /> : <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
                    <span>
                      {hasBomShortage 
                        ? 'Warning: Some selected raw materials do not have sufficient stock for this batch.' 
                        : 'All required raw materials are available in inventory.'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: DEFAULT PRESET PRODUCTS GRID */
            isWadaana ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-sky-50/50 p-4 rounded-xl border border-sky-100">
                <div>
                  <label className="block text-xs font-bold text-cyan-800 uppercase mb-1">
                    0.5L Pure / Pure Bite (15g Preform)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 5000 bottles"
                    value={qtyPure05L}
                    onChange={e => setQtyPure05L(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full border border-slate-200 rounded-xl p-3 font-bold text-slate-800 bg-white focus:border-cyan-500 outline-none shadow-2xs"
                  />
                  <span className="text-[10px] text-cyan-600 font-semibold mt-1 block">
                    15g Pure Preform per bottle
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-sky-800 uppercase mb-1">
                    1.5L Pure / Pure Bite (30g Preform)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 2500 bottles"
                    value={qtyPure15L}
                    onChange={e => setQtyPure15L(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full border border-slate-200 rounded-xl p-3 font-bold text-slate-800 bg-white focus:border-sky-500 outline-none shadow-2xs"
                  />
                  <span className="text-[10px] text-sky-600 font-semibold mt-1 block">
                    30g Pure Preform per bottle
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-800 uppercase mb-1">
                    0.5L Dasani Mix / Mix Blue (13g Preform)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 3000 bottles"
                    value={qtyMix05L}
                    onChange={e => setQtyMix05L(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full border border-slate-200 rounded-xl p-3 font-bold text-slate-800 bg-white focus:border-amber-500 outline-none shadow-2xs"
                  />
                  <span className="text-[10px] text-amber-600 font-semibold mt-1 block">
                    13g Mix Preform per bottle
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-orange-800 uppercase mb-1">
                    1.5L Dasani Mix / Mix Blue (27g Preform)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 1500 bottles"
                    value={qtyMix15L}
                    onChange={e => setQtyMix15L(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full border border-slate-200 rounded-xl p-3 font-bold text-slate-800 bg-white focus:border-orange-500 outline-none shadow-2xs"
                  />
                  <span className="text-[10px] text-orange-600 font-semibold mt-1 block">
                    27g Mix Preform per bottle
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">0.5L PET Pack (12 Bottles)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 200"
                    value={packs05L}
                    onChange={e => setPacks05L(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 font-bold text-slate-800 bg-white focus:border-emerald-500 outline-none shadow-2xs"
                  />
                  <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
                    9L water/pack • <strong>{(parseInt(packs05L || 0, 10) * 12).toLocaleString()} PETs</strong>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">1.5L PET Pack (6 Bottles)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 100"
                    value={packs15L}
                    onChange={e => setPacks15L(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 font-bold text-slate-800 bg-white focus:border-emerald-500 outline-none shadow-2xs"
                  />
                  <span className="text-[11px] text-purple-700 font-semibold mt-1 block">
                    12L water/pack • <strong>{(parseInt(packs15L || 0, 10) * 6).toLocaleString()} PETs</strong>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">19L Refill Bottle</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 50"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 font-bold text-slate-800 bg-white focus:border-emerald-500 outline-none shadow-2xs"
                  />
                  <span className="text-[11px] text-blue-700 font-semibold mt-1 block">
                    24L water/bottle (19L + 5L wash)
                  </span>
                </div>
              </div>
            )
          )}

          {/* Shift Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Remarks / Shift Notes</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional shift notes, batch remarks..."
              className="w-full border border-slate-200 rounded-xl p-3 text-sm font-medium focus:border-slate-400 outline-none shadow-2xs"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-6 py-2.5 rounded-xl font-bold text-white text-xs shadow-md transition disabled:opacity-50 ${
                isWadaana ? 'bg-[#0ea5e9] hover:bg-sky-600' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {submitting ? 'Recording Batch...' : 'Record Production Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
