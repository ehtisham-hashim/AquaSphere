import { useState, useEffect, useMemo } from 'react';
import { X, AlertTriangle, Package, CheckCircle2, Factory } from 'lucide-react';
import { toast } from 'sonner';

export default function CompleteBatchModal({
  isOpen,
  onClose,
  onSubmit,
  batchToComplete,
  items = [],
  isWadaana,
  submitting
}) {
  const [breakages, setBreakages] = useState({});

  // Reset internal breakage state whenever modal opens or active batch changes
  useEffect(() => {
    if (isOpen) {
      setBreakages({});
    }
  }, [isOpen, batchToComplete?.id]);

  // Dynamically extract the products that were ACTUALLY produced in this batch
  const producedProducts = useMemo(() => {
    if (!batchToComplete) return [];

    // 1. Check if remarks contains producedItems (supports custom items like Pivirifine + standard items in unified batch)
    if (batchToComplete.remarks) {
      try {
        const parsed = JSON.parse(batchToComplete.remarks);
        if (Array.isArray(parsed.producedItems) && parsed.producedItems.length > 0) {
          return parsed.producedItems.map(item => {
            const dbItem = items.find(i => i.id === item.itemId);
            const name = dbItem?.name || item.name || 'Finished Good';
            const unit = dbItem?.unit || item.unit || 'units';
            const nameLower = name.toLowerCase();

            // Check if standard AquaSphere / Wadaana or custom
            let key;
            let isPacks = false;
            let perPack = 1;
            let pieceLabel;
            let maxBreakage;

            if ((nameLower.includes('0.5') && nameLower.includes('pet')) && !nameLower.includes('pure') && !nameLower.includes('mix')) {
              key = 'brokenBottles05L';
              isPacks = true;
              perPack = 12;
              pieceLabel = 'broken bottles';
              maxBreakage = item.quantity * 12;
            } else if (((nameLower.includes('1.5') || nameLower.includes('1500')) && nameLower.includes('pet')) && !nameLower.includes('pure') && !nameLower.includes('mix')) {
              key = 'brokenBottles15L';
              isPacks = true;
              perPack = 6;
              pieceLabel = 'broken bottles';
              maxBreakage = item.quantity * 6;
            } else if (nameLower.includes('19l') || nameLower.includes('19 l')) {
              key = 'wasteQuantity';
              pieceLabel = 'bottles';
              maxBreakage = item.quantity;
            } else if (nameLower.includes('pure') && (nameLower.includes('0.5') || nameLower.includes('500'))) {
              key = 'brokenPure05L';
              pieceLabel = 'bottles';
              maxBreakage = item.quantity;
            } else if (nameLower.includes('pure') && (nameLower.includes('1.5') || nameLower.includes('1500'))) {
              key = 'brokenPure15L';
              pieceLabel = 'bottles';
              maxBreakage = item.quantity;
            } else if (nameLower.includes('mix') && (nameLower.includes('0.5') || nameLower.includes('500'))) {
              key = 'brokenMix05L';
              pieceLabel = 'bottles';
              maxBreakage = item.quantity;
            } else if (nameLower.includes('mix') && (nameLower.includes('1.5') || nameLower.includes('1500'))) {
              key = 'brokenMix15L';
              pieceLabel = 'bottles';
              maxBreakage = item.quantity;
            } else {
              key = `breakage_${item.itemId}`;
              pieceLabel = unit;
              maxBreakage = item.quantity;
            }

            return {
              itemId: item.itemId,
              key,
              name,
              unit,
              qty: item.quantity,
              bottlesTotal: isPacks ? item.quantity * perPack : null,
              maxBreakage,
              pieceLabel,
              isPacks,
              perPack
            };
          });
        }
      } catch (_err) {
        // Ignore invalid JSON in remarks
      }
    }

    // 2. Single custom outputItem batch
    if (batchToComplete.outputItem || batchToComplete.outputItemId) {
      const fg = batchToComplete.outputItem || items.find(i => i.id === batchToComplete.outputItemId);
      return [
        {
          itemId: batchToComplete.outputItemId || batchToComplete.outputItem?.id,
          key: 'wasteQuantity',
          name: fg?.name || 'Finished Good',
          unit: fg?.unit || 'units',
          qty: batchToComplete.quantity || 0,
          maxBreakage: batchToComplete.quantity || 0,
          pieceLabel: fg?.unit || 'units',
          isPacks: false
        }
      ];
    }

    // 3. Wadaana batch
    if (isWadaana) {
      const list = [];
      if (batchToComplete.qtyPure05L > 0) {
        const fg = items.find(i => i.type === 'FINISHED_GOOD' && i.name.toLowerCase().includes('pure') && (i.name.toLowerCase().includes('0.5') || i.name.toLowerCase().includes('500')));
        list.push({
          itemId: fg?.id,
          key: 'brokenPure05L',
          name: fg?.name || '0.5L Pure Bottled Water',
          unit: fg?.unit || 'bottles',
          qty: batchToComplete.qtyPure05L,
          maxBreakage: batchToComplete.qtyPure05L,
          pieceLabel: 'bottles',
          isPacks: false
        });
      }
      if (batchToComplete.qtyPure15L > 0) {
        const fg = items.find(i => i.type === 'FINISHED_GOOD' && i.name.toLowerCase().includes('pure') && (i.name.toLowerCase().includes('1.5') || i.name.toLowerCase().includes('1500')));
        list.push({
          itemId: fg?.id,
          key: 'brokenPure15L',
          name: fg?.name || '1.5L Pure Bottled Water',
          unit: fg?.unit || 'bottles',
          qty: batchToComplete.qtyPure15L,
          maxBreakage: batchToComplete.qtyPure15L,
          pieceLabel: 'bottles',
          isPacks: false
        });
      }
      if (batchToComplete.qtyMix05L > 0) {
        const fg = items.find(i => i.type === 'FINISHED_GOOD' && i.name.toLowerCase().includes('mix') && (i.name.toLowerCase().includes('0.5') || i.name.toLowerCase().includes('500')));
        list.push({
          itemId: fg?.id,
          key: 'brokenMix05L',
          name: fg?.name || '0.5L Mix Bottled Water',
          unit: fg?.unit || 'bottles',
          qty: batchToComplete.qtyMix05L,
          maxBreakage: batchToComplete.qtyMix05L,
          pieceLabel: 'bottles',
          isPacks: false
        });
      }
      if (batchToComplete.qtyMix15L > 0) {
        const fg = items.find(i => i.type === 'FINISHED_GOOD' && i.name.toLowerCase().includes('mix') && (i.name.toLowerCase().includes('1.5') || i.name.toLowerCase().includes('1500')));
        list.push({
          itemId: fg?.id,
          key: 'brokenMix15L',
          name: fg?.name || '1.5L Mix Bottled Water',
          unit: fg?.unit || 'bottles',
          qty: batchToComplete.qtyMix15L,
          maxBreakage: batchToComplete.qtyMix15L,
          pieceLabel: 'bottles',
          isPacks: false
        });
      }
      return list;
    }

    // 4. AquaSphere unified / standard batch
    const list = [];
    if (batchToComplete.quantity > 0) {
      const fg19L = items.find(i => i.type === 'FINISHED_GOOD' && (i.name.toLowerCase().includes('19l') || i.name.toLowerCase().includes('19 l')));
      list.push({
        itemId: fg19L?.id,
        key: 'wasteQuantity',
        name: fg19L?.name || '19L Refill Bottle',
        unit: fg19L?.unit || 'bottles',
        qty: batchToComplete.quantity,
        maxBreakage: batchToComplete.quantity,
        pieceLabel: 'bottles',
        isPacks: false
      });
    }
    if (batchToComplete.packs15L > 0) {
      const fg15L = items.find(i => i.type === 'FINISHED_GOOD' && (i.name.toLowerCase().includes('1.5') || i.name.toLowerCase().includes('1500')));
      list.push({
        itemId: fg15L?.id,
        key: 'brokenBottles15L',
        name: fg15L?.name || '1.5L PET Pack',
        unit: fg15L?.unit || 'packs',
        qty: batchToComplete.packs15L,
        bottlesTotal: batchToComplete.packs15L * 6,
        maxBreakage: batchToComplete.packs15L * 6,
        pieceLabel: 'broken bottles',
        isPacks: true,
        perPack: 6
      });
    }
    if (batchToComplete.packs05L > 0) {
      const fg05L = items.find(i => i.type === 'FINISHED_GOOD' && (i.name.toLowerCase().includes('0.5') || i.name.toLowerCase().includes('500')));
      list.push({
        itemId: fg05L?.id,
        key: 'brokenBottles05L',
        name: fg05L?.name || '0.5L PET Pack',
        unit: fg05L?.unit || 'packs',
        qty: batchToComplete.packs05L,
        bottlesTotal: batchToComplete.packs05L * 12,
        maxBreakage: batchToComplete.packs05L * 12,
        pieceLabel: 'broken bottles',
        isPacks: true,
        perPack: 12
      });
    }
    return list;
  }, [batchToComplete, items, isWadaana]);

  if (!isOpen || !batchToComplete) return null;

  const handleBreakageChange = (key, val) => {
    const clean = val.replace(/[^0-9]/g, '');
    setBreakages(prev => ({
      ...prev,
      [key]: clean
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate breakages for each produced item
    const itemBreakages = {};
    for (const prod of producedProducts) {
      const val = parseInt(breakages[prod.key] || 0, 10);
      if (val < 0) {
        toast.error(`Breakage for ${prod.name} cannot be negative`);
        return;
      }
      if (val > prod.maxBreakage) {
        toast.error(`Breakage for ${prod.name} (${val}) cannot exceed produced amount (${prod.maxBreakage})`);
        return;
      }
      if (prod.itemId) {
        itemBreakages[prod.itemId] = val;
      }
    }

    // Build payload matching backend expectations
    if (batchToComplete.outputItem || batchToComplete.outputItemId) {
      const w = parseInt(breakages.wasteQuantity || 0, 10);
      onSubmit({ wasteQuantity: w, itemBreakages, confirmed: true });
      return;
    }

    if (isWadaana) {
      onSubmit({
        brokenPure05L: parseInt(breakages.brokenPure05L || 0, 10),
        brokenPure15L: parseInt(breakages.brokenPure15L || 0, 10),
        brokenMix05L: parseInt(breakages.brokenMix05L || 0, 10),
        brokenMix15L: parseInt(breakages.brokenMix15L || 0, 10),
        itemBreakages,
        confirmed: true
      });
      return;
    }

    // AquaSphere
    onSubmit({
      brokenBottles05L: parseInt(breakages.brokenBottles05L || 0, 10),
      brokenBottles15L: parseInt(breakages.brokenBottles15L || 0, 10),
      wasteQuantity: parseInt(breakages.wasteQuantity || 0, 10),
      itemBreakages,
      confirmed: true
    });
  };

  const batchShortId = `#${batchToComplete.id.substring(0, 8).toUpperCase()}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`px-6 py-4 flex justify-between items-center text-white shrink-0 ${
          isWadaana 
            ? 'bg-gradient-to-r from-sky-600 to-blue-700' 
            : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Factory size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">Confirm & Complete Batch</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-white/20 font-semibold">
                  {batchShortId}
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                Verify outputs and record scrap/breakage to finalize inventory.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/20 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
            <span>Products in this Run ({producedProducts.length})</span>
            <span>Recorded Output & Waste Verification</span>
          </div>

          {producedProducts.length === 0 ? (
            <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
              No products found for this batch. Click below to complete.
            </div>
          ) : (
            <div className="space-y-3">
              {producedProducts.map((prod) => {
                const breakageVal = parseInt(breakages[prod.key] || 0, 10);
                
                let netText;
                if (prod.isPacks && prod.perPack) {
                  const netBottles = Math.max(0, prod.bottlesTotal - breakageVal);
                  const netPacks = (netBottles / prod.perPack).toFixed(1);
                  netText = `${netPacks} packs (${netBottles} bottles)`;
                } else {
                  const net = Math.max(0, prod.qty - breakageVal);
                  netText = `${net.toLocaleString()} ${prod.unit}`;
                }

                return (
                  <div
                    key={prod.key}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-slate-300 transition space-y-3 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Package size={16} className="text-brand shrink-0" />
                          <h4 className="text-sm font-bold text-slate-900">{prod.name}</h4>
                        </div>
                        <p className="text-xs text-slate-500">
                          Produced:{' '}
                          <strong className="text-slate-800 font-mono">
                            {prod.qty.toLocaleString()} {prod.unit}
                          </strong>
                          {prod.bottlesTotal && (
                            <span className="text-slate-400 font-normal ml-1">
                              ({prod.bottlesTotal.toLocaleString()} total bottles)
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Breakage Input */}
                      <div className="text-right shrink-0">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-600 mb-1">
                          Scrap / Broken ({prod.pieceLabel})
                        </label>
                        <div className="flex items-center gap-1.5 justify-end">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={breakages[prod.key] || ''}
                            onChange={(e) => handleBreakageChange(prod.key, e.target.value)}
                            placeholder="0"
                            className="w-20 border border-slate-300 bg-white rounded-lg p-1.5 text-right font-mono font-bold text-sm text-slate-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Max: {prod.maxBreakage.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Net Output Preview */}
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Net Good Output added to Stock:</span>
                      <span className="font-bold font-mono text-emerald-700 flex items-center gap-1 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md text-[11px]">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        +{netText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Operational Formula Notification */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-900 text-xs flex items-start gap-2">
            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Automatic Formula Deduction:</strong> Confirming this run will deduct the exact raw materials (caps, labels, bottles, shrink wrap, minerals) and update Factory Finished Goods inventory.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs py-2 px-4 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-xs py-2 px-5 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 size={14} />
              {submitting ? 'Confirming Batch...' : 'Confirm & Complete Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
