import { useState, useEffect, useMemo } from 'react';
import { X, Package, Calendar, RefreshCw, CheckCircle2, Factory, Hash } from 'lucide-react';
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
  const [batchDate, setBatchDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [quantities, setQuantities] = useState({});

  // Dynamic Finished Goods strictly from the database
  const finishedGoods = useMemo(
    () => items.filter(i => i.type === 'FINISHED_GOOD' && !i.archivedAt),
    [items]
  );

  // Reset form whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      setBatchDate(localDate);
      setNotes('');
      setQuantities({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQuantityChange = (itemId, val) => {
    const cleanVal = val.replace(/[^0-9]/g, '');
    setQuantities(prev => ({
      ...prev,
      [itemId]: cleanVal
    }));
  };

  // Calculate total production units and active items
  const activeEntries = finishedGoods
    .map(fg => ({
      ...fg,
      qty: parseInt(quantities[fg.id] || 0, 10)
    }))
    .filter(e => e.qty > 0);

  const totalQuantity = activeEntries.reduce((sum, e) => sum + e.qty, 0);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (activeEntries.length === 0) {
      toast.error('Please enter a quantity greater than 0 for at least one finished good');
      return;
    }

    const payload = {
      items: activeEntries.map(e => ({
        outputItemId: e.id,
        quantity: e.qty
      })),
      batchDate,
      notes: notes.trim()
    };

    onSubmit(payload);
  };

  const batchPrefix = isWadaana ? 'WB' : 'AQ';
  const dateFormatted = batchDate ? batchDate.replace(/-/g, '') : 'YYYYMMDD';
  const autoBatchNumber = `${batchPrefix}-${dateFormatted}-${String(batchesCount + 1).padStart(3, '0')}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] border border-slate-100 flex flex-col">
        
        {/* Header */}
        <div className={`px-6 py-4 flex justify-between items-center z-10 shrink-0 ${
          isWadaana 
            ? 'bg-gradient-to-r from-sky-600 to-blue-700 text-white' 
            : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Factory size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Log Production Batch</h3>
              <p className="text-xs text-white/80">
                Record factory floor output directly for registered finished goods.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 flex flex-col overflow-y-auto">
          
          {/* Section 1: Batch Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" />
                <span>Production Date *</span>
              </label>
              <input
                type="date"
                value={batchDate}
                onChange={e => setBatchDate(e.target.value)}
                className="input-base"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Hash size={13} className="text-slate-400" />
                <span>Auto Batch Number</span>
              </label>
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-mono font-black text-slate-700 flex items-center justify-between shadow-2xs">
                <span>{autoBatchNumber}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-200/70 px-2 py-0.5 rounded">
                  Read-Only
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Finished Goods List */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Package size={15} /> Registered Finished Goods ({finishedGoods.length})
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                Enter quantity produced for each product
              </span>
            </div>

            {finishedGoods.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-1">
                <Package size={28} className="text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No Finished Goods Found</p>
                <p className="text-xs text-slate-400">
                  Please register Finished Goods in the Items/Inventory catalog first.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {finishedGoods.map(fg => {
                  const qty = parseInt(quantities[fg.id] || 0, 10);
                  const isProduced = qty > 0;

                  return (
                    <div
                      key={fg.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isProduced
                          ? isWadaana
                            ? 'bg-sky-50/50 border-sky-400 shadow-2xs ring-1 ring-sky-400/20'
                            : 'bg-emerald-50/50 border-emerald-400 shadow-2xs ring-1 ring-emerald-400/20'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        
                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <span>{fg.name}</span>
                            {isProduced && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                isWadaana ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                <CheckCircle2 size={11} /> {qty.toLocaleString()} {fg.unit}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                            <span>
                              Current Stock: <strong className="font-mono text-slate-700">{Number(fg.cachedQty || 0).toLocaleString()} {fg.unit}</strong>
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[11px] text-slate-400">
                              Factory: {Number(fg.factoryQty || 0).toLocaleString()} | Warehouse: {Number(fg.warehouseQty || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Direct Quantity Input */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="relative w-36">
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="0"
                              value={quantities[fg.id] || ''}
                              onChange={e => handleQuantityChange(fg.id, e.target.value)}
                              className={`w-full border rounded-xl py-2 px-3 pr-14 text-sm font-black font-mono text-slate-900 bg-white outline-none transition ${
                                isProduced 
                                  ? (isWadaana ? 'border-sky-500 ring-2 ring-sky-500/10' : 'border-emerald-500 ring-2 ring-emerald-500/10')
                                  : 'border-slate-200 focus:border-slate-400'
                              }`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 uppercase pointer-events-none truncate max-w-[40px]">
                              {fg.unit}
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: Notes / Shift Remarks */}
          <div className="border-t border-slate-100 pt-4">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Notes / Shift Remarks (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Shift A run, regular bottled production..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="input-base text-xs"
            />
          </div>

          {/* Section 4: Production Summary Banner */}
          {activeEntries.length > 0 && (
            <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-bold ${
              isWadaana 
                ? 'bg-sky-50 border-sky-200 text-sky-900' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className={isWadaana ? 'text-sky-600' : 'text-emerald-600'} />
                <span>
                  Total to Log: <strong>{totalQuantity.toLocaleString()}</strong> units across <strong>{activeEntries.length}</strong> finished good(s)
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {activeEntries.map(e => (
                  <span key={e.id} className="bg-white/80 border border-slate-200/80 px-2 py-0.5 rounded text-[11px] font-mono">
                    {e.name.split('(')[0].trim()}: {e.qty}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 mt-auto">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs py-2.5 px-4"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || totalQuantity === 0}
              className="btn-primary text-xs py-2.5 px-5 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
            >
              {submitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Recording Batch...</span>
                </>
              ) : (
                <>
                  <Factory size={14} />
                  <span>
                    Log Production Batch {activeEntries.length > 0 ? `(${totalQuantity.toLocaleString()})` : ''}
                  </span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
