import { useState, useEffect } from 'react';
import { X, Scale } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateBatchModal({
  isOpen,
  onClose,
  onSubmit,
  isWadaana,
  items,
  batchesCount,
  submitting
}) {
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // AquaSphere fields
  const [packs05L, setPacks05L] = useState('');
  const [packs15L, setPacks15L] = useState('');
  const [quantity, setQuantity] = useState('');

  // Wadaana fields
  const [qtyPure05L, setQtyPure05L] = useState('');
  const [qtyPure15L, setQtyPure15L] = useState('');
  const [qtyMix05L, setQtyMix05L] = useState('');
  const [qtyMix15L, setQtyMix15L] = useState('');

  // Reset internal form state whenever modal opens or closes
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
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
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

  const getItemQty = (keywords) => {
    const item = items.find(i => i.type === 'RAW_MATERIAL' && keywords.some(kw => i.name.toLowerCase().includes(kw.toLowerCase())));
    return item ? Number(item.cachedQty || 0) : 0;
  };

  // Wadaana preform calculations
  const wP05 = parseInt(qtyPure05L || 0, 10);
  const wP15 = parseInt(qtyPure15L || 0, 10);
  const wM05 = parseInt(qtyMix05L || 0, 10);
  const wM15 = parseInt(qtyMix15L || 0, 10);
  const totalWadaanaBottles = wP05 + wP15 + wM05 + wM15;
  const totalPureKg = (wP05 * 0.015) + (wP15 * 0.030);
  const totalMixKg = (wM05 * 0.013) + (wM15 * 0.027);
  const purePreformStock = getItemQty(['pure preform', 'pure']);
  const mixPreformStock = getItemQty(['mix preform', 'mix']);
  const isPureShort = totalPureKg > 0 && purePreformStock < totalPureKg;
  const isMixShort = totalMixKg > 0 && mixPreformStock < totalMixKg;
  const hasWadaanaShortage = isPureShort || isMixShort;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-slate-100">
        <div className="sticky top-0 bg-slate-900 text-white px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h3 className="text-lg font-bold">Record Factory Production Batch</h3>
            <p className="text-xs text-slate-400">
              {isWadaana ? 'Enter single bottle counts. Recorded batches are locked for audit verification.' : 'Enter pack counts — exact auto-deductions are calculated automatically and locked upon recording.'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Production Date</label>
              <input
                type="date"
                value={batchDate}
                onChange={e => setBatchDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm font-medium focus:border-emerald-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Auto Batch Number</label>
              <div className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm font-mono font-black text-slate-700 flex items-center justify-between">
                <span>{isWadaana ? 'WB' : 'AQ'}-{batchDate ? batchDate.replace(/-/g, '') : 'YYYYMMDD'}-{String(batchesCount + 1).padStart(3, '0')}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-200 px-2 py-0.5 rounded">Read-Only</span>
              </div>
            </div>
          </div>

          {isWadaana ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-cyan-700 uppercase mb-1">0.5L Pure Bottles (15g)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 5000"
                  value={qtyPure05L}
                  onChange={e => setQtyPure05L(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:border-cyan-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sky-700 uppercase mb-1">1.5L Pure Bottles (30g)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 2500"
                  value={qtyPure15L}
                  onChange={e => setQtyPure15L(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:border-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-700 uppercase mb-1">0.5L Mix Bottles (13g)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 3000"
                  value={qtyMix05L}
                  onChange={e => setQtyMix05L(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-orange-700 uppercase mb-1">1.5L Mix Bottles (27g)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 1500"
                  value={qtyMix15L}
                  onChange={e => setQtyMix15L(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:border-orange-500 outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">0.5L PET Pack (12 Bottles)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 200"
                  value={packs05L}
                  onChange={e => setPacks05L(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:border-emerald-500 outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">9L total water per pack</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">1.5L PET Pack (6 Bottles)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 100"
                  value={packs15L}
                  onChange={e => setPacks15L(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:border-emerald-500 outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">9L total water per pack</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">19L Refill Bottle</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 50"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:border-emerald-500 outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">19L total water</span>
              </div>
            </div>
          )}

          {/* Wadaana Summary */}
          {isWadaana && totalWadaanaBottles > 0 && (
            <div className={`border rounded-2xl p-4 space-y-3 transition-colors ${hasWadaanaShortage ? 'bg-rose-50/90 border-rose-300' : 'bg-sky-50/80 border-sky-200'}`}>
              <div className="flex justify-between items-center border-b border-slate-200/80 pb-2.5">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-sky-600" /> Wadaana Production Summary
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Preform consumption & stock validation preview</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Today&apos;s Total Output</span>
                  <span className="text-base font-black text-sky-900 bg-sky-100 px-3 py-1 rounded-xl border border-sky-200 inline-block mt-0.5">
                    {totalWadaanaBottles.toLocaleString()} Bottles
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs font-bold pt-1">
                <div className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${isPureShort ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                  {isPureShort ? (
                    <span>❌ Insufficient Pure Preform Stock ({purePreformStock} kg available vs {totalPureKg.toFixed(2)} kg needed)</span>
                  ) : (
                    <span>✓ Enough Pure Preform {totalPureKg > 0 ? `(${totalPureKg.toFixed(2)} kg required)` : ''}</span>
                  )}
                </div>

                <div className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${isMixShort ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                  {isMixShort ? (
                    <span>❌ Insufficient Mix Preform Stock ({mixPreformStock} kg available vs {totalMixKg.toFixed(2)} kg needed)</span>
                  ) : (
                    <span>✓ Enough Mix Preform {totalMixKg > 0 ? `(${totalMixKg.toFixed(2)} kg required)` : ''}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Remarks / Shift Notes</label>
            <input
              type="text"
              placeholder="Optional shift notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-600 font-semibold text-sm hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (isWadaana ? hasWadaanaShortage : false)}
              className={`px-6 py-2.5 ${isWadaana ? 'bg-[#0ea5e9] hover:bg-sky-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {submitting ? 'Recording Batch...' : 'Record Production Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
