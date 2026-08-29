import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function CompleteBatchModal({
  isOpen,
  onClose,
  onSubmit,
  batchToComplete,
  isWadaana,
  submitting
}) {
  // Wadaana Broken State
  const [brokenPure05L, setBrokenPure05L] = useState('');
  const [brokenPure15L, setBrokenPure15L] = useState('');
  const [brokenMix05L, setBrokenMix05L] = useState('');
  const [brokenMix15L, setBrokenMix15L] = useState('');

  // AquaSphere Broken State
  const [brokenBottles05L, setBrokenBottles05L] = useState('');
  const [brokenBottles15L, setBrokenBottles15L] = useState('');
  const [wasteQuantity, setWasteQuantity] = useState('');

  // Reset internal breakage state whenever modal opens or active batch changes
  useEffect(() => {
    if (isOpen) {
      setBrokenPure05L('');
      setBrokenPure15L('');
      setBrokenMix05L('');
      setBrokenMix15L('');
      setBrokenBottles05L('');
      setBrokenBottles15L('');
      setWasteQuantity('');
    }
  }, [isOpen, batchToComplete?.id]);

  if (!isOpen || !batchToComplete) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isWadaana) {
      const brP05 = parseInt(brokenPure05L || 0);
      const brP15 = parseInt(brokenPure15L || 0);
      const brM05 = parseInt(brokenMix05L || 0);
      const brM15 = parseInt(brokenMix15L || 0);

      const maxP05 = batchToComplete?.qtyPure05L || 0;
      const maxP15 = batchToComplete?.qtyPure15L || 0;
      const maxM05 = batchToComplete?.qtyMix05L || 0;
      const maxM15 = batchToComplete?.qtyMix15L || 0;

      if (brP05 > maxP05) {
        toast.error(`Broken 0.5L Pure bottles (${brP05}) cannot exceed produced amount (${maxP05})`);
        return;
      }
      if (brP15 > maxP15) {
        toast.error(`Broken 1.5L Pure bottles (${brP15}) cannot exceed produced amount (${maxP15})`);
        return;
      }
      if (brM05 > maxM05) {
        toast.error(`Broken 0.5L Mix bottles (${brM05}) cannot exceed produced amount (${maxM05})`);
        return;
      }
      if (brM15 > maxM15) {
        toast.error(`Broken 1.5L Mix bottles (${brM15}) cannot exceed produced amount (${maxM15})`);
        return;
      }

      onSubmit({
        brokenPure05L: brP05,
        brokenPure15L: brP15,
        brokenMix05L: brM05,
        brokenMix15L: brM15,
        confirmed: true
      });
    } else {
      const br05 = parseInt(brokenBottles05L || 0);
      const br15 = parseInt(brokenBottles15L || 0);
      const w19 = parseInt(wasteQuantity || 0);

      const max05LBottles = (batchToComplete?.packs05L || 0) * 12;
      const max15LBottles = (batchToComplete?.packs15L || 0) * 6;
      const max19LBottles = batchToComplete?.quantity || 0;

      if (br05 > max05LBottles) {
        toast.error(`Broken 0.5L bottles (${br05}) cannot exceed total produced bottles (${max05LBottles} pcs)`);
        return;
      }
      if (br15 > max15LBottles) {
        toast.error(`Broken 1.5L bottles (${br15}) cannot exceed total produced bottles (${max15LBottles} pcs)`);
        return;
      }
      if (w19 > max19LBottles) {
        toast.error(`Broken 19L bottles (${w19}) cannot exceed total produced bottles (${max19LBottles} pcs)`);
        return;
      }

      onSubmit({
        brokenBottles05L: br05,
        brokenBottles15L: br15,
        wasteQuantity: w19,
        confirmed: true
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">Confirm & Complete Batch</h3>
            <p className="text-xs text-slate-400">Complete production batch and update inventory.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {isWadaana ? (
            <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200 space-y-3">
              <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Wadaana Production Breakage (pcs)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Broken 0.5L Pure <span className="text-slate-400 font-normal">(Max: {batchToComplete?.qtyPure05L || 0})</span>
                  </label>
                  <input 
                    type="number" 
                    min="0" 
                    max={batchToComplete?.qtyPure05L || 0}
                    disabled={(batchToComplete?.qtyPure05L || 0) === 0}
                    placeholder="0" 
                    value={brokenPure05L} 
                    onChange={e => setBrokenPure05L(e.target.value)} 
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-medium focus:border-rose-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Broken 1.5L Pure <span className="text-slate-400 font-normal">(Max: {batchToComplete?.qtyPure15L || 0})</span>
                  </label>
                  <input 
                    type="number" 
                    min="0" 
                    max={batchToComplete?.qtyPure15L || 0}
                    disabled={(batchToComplete?.qtyPure15L || 0) === 0}
                    placeholder="0" 
                    value={brokenPure15L} 
                    onChange={e => setBrokenPure15L(e.target.value)} 
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-medium focus:border-rose-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Broken 0.5L Mix <span className="text-slate-400 font-normal">(Max: {batchToComplete?.qtyMix05L || 0})</span>
                  </label>
                  <input 
                    type="number" 
                    min="0" 
                    max={batchToComplete?.qtyMix05L || 0}
                    disabled={(batchToComplete?.qtyMix05L || 0) === 0}
                    placeholder="0" 
                    value={brokenMix05L} 
                    onChange={e => setBrokenMix05L(e.target.value)} 
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-medium focus:border-rose-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Broken 1.5L Mix <span className="text-slate-400 font-normal">(Max: {batchToComplete?.qtyMix15L || 0})</span>
                  </label>
                  <input 
                    type="number" 
                    min="0" 
                    max={batchToComplete?.qtyMix15L || 0}
                    disabled={(batchToComplete?.qtyMix15L || 0) === 0}
                    placeholder="0" 
                    value={brokenMix15L} 
                    onChange={e => setBrokenMix15L(e.target.value)} 
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-medium focus:border-rose-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed" 
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200 space-y-3">
              <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Breakage During Batch
              </h4>
              {(() => {
                const max05 = (batchToComplete?.packs05L || 0) * 12;
                const max15 = (batchToComplete?.packs15L || 0) * 6;
                const max19 = batchToComplete?.quantity || 0;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Broken 0.5L (pcs) <span className="text-slate-400 font-normal">(Max: {max05})</span>
                      </label>
                      <input 
                        type="number" 
                        min="0" 
                        max={max05}
                        disabled={max05 === 0}
                        placeholder="0" 
                        value={brokenBottles05L} 
                        onChange={e => setBrokenBottles05L(e.target.value)} 
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-medium focus:border-rose-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed" 
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Broken 1.5L (pcs) <span className="text-slate-400 font-normal">(Max: {max15})</span>
                      </label>
                      <input 
                        type="number" 
                        min="0" 
                        max={max15}
                        disabled={max15 === 0}
                        placeholder="0" 
                        value={brokenBottles15L} 
                        onChange={e => setBrokenBottles15L(e.target.value)} 
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-medium focus:border-rose-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed" 
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Broken 19L (pcs) <span className="text-slate-400 font-normal">(Max: {max19})</span>
                      </label>
                      <input 
                        type="number" 
                        min="0" 
                        max={max19}
                        disabled={max19 === 0}
                        placeholder="0" 
                        value={wasteQuantity} 
                        onChange={e => setWasteQuantity(e.target.value)} 
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-medium focus:border-rose-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed" 
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2 text-slate-600 font-semibold text-sm hover:bg-slate-100 rounded-xl">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className={`px-6 py-2 ${isWadaana ? 'bg-[#0ea5e9] hover:bg-sky-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50`}>
              {submitting ? 'Completing...' : 'Complete Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
