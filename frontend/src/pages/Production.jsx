export { default } from '../features/production/Production';
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rawMaterials.map(rm => {
            const stock = parseFloat(rm.cachedQty || 0);
            const reorder = parseFloat(rm.reorderLevel || 0);
            const isLow = stock <= reorder;

            return (
              <div 
                key={rm.id} 
                className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                  isLow 
                    ? 'bg-rose-50/50 border-rose-200' 
                    : 'bg-slate-50/50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{rm.name}</span>
                  {isLow && (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-md flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> LOW
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <div className="flex items-baseline justify-between">
                    <span className={`text-2xl font-bold font-mono ${isLow ? 'text-rose-700' : 'text-slate-800'}`}>
                      {stock.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">{rm.unit}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${isLow ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, Math.max(10, (stock / (reorder * 3 || 1)) * 100))}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1">Reorder Level: {reorder} {rm.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature 5: Production History Audit Trail */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Factory className="w-5 h-5 text-slate-600" />
              Production History & Batch Audit Trail
            </h3>
            <p className="text-xs text-slate-500">Read-only audit log of past production runs and exact deductions</p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
            Total Batches: {batches.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Batch ID & Date</th>
                <th className="p-3.5">Output (0.5L Packs)</th>
                <th className="p-3.5">Output (1.5L Packs)</th>
                <th className="p-3.5">Total Water Treated</th>
                <th className="p-3.5">Breakage / Waste</th>
                <th className="p-3.5">Deductions Logged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400">No production batches recorded.</td>
                </tr>
              ) : (
                batches.map(b => {
                  const p05 = b.packs05L || 0;
                  const p15 = b.packs15L || 0;
                  const litres = (p05 * 6) + (p15 * 9);
                  const b05 = b.brokenBottles05L || 0;
                  const b15 = b.brokenBottles15L || 0;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-slate-800">#{b.id.substring(0, 8).toUpperCase()}</span>
                        <span className="text-xs text-slate-400 block">{new Date(b.createdAt).toLocaleString()}</span>
                      </td>
                      <td className="p-3.5 font-bold text-emerald-600">+{p05} packs</td>
                      <td className="p-3.5 font-bold text-purple-600">+{p15} packs</td>
                      <td className="p-3.5 font-mono font-medium text-slate-700">{litres} Litres</td>
                      <td className="p-3.5">
                        {(b05 > 0 || b15 > 0 || b.wasteQuantity > 0) ? (
                          <span className="text-rose-600 font-semibold text-xs bg-rose-50 px-2 py-1 rounded-md">
                            {b05 + b15 + (b.wasteQuantity || 0)} broken/waste
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Clean</span>
                        )}
                      </td>
                      <td className="p-3.5 text-xs text-slate-500 max-w-xs truncate">
                        {b.consumptions?.length > 0 
                          ? b.consumptions.map(c => `${c.item?.name}: ${parseFloat(c.quantityUsed).toFixed(3)}`).join(', ')
                          : 'Auto-calculated'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feature 2, 3, 4: Log Batch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="sticky top-0 bg-slate-900 text-white px-6 py-4 flex justify-between items-center z-10">
              <div>
                <h3 className="text-lg font-bold">Log Factory Production Run</h3>
                <p className="text-xs text-slate-400">Enter pack counts — exact decimal auto-deductions are calculated automatically.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLogBatch} className="p-6 space-y-6">
              {/* Date Selection */}
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

              {/* Feature 2: Pack Entries */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    0.5L PET Packs (12 bottles)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 200"
                    value={packs05L}
                    onChange={e => setPacks05L(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:border-emerald-500 outline-none"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Deducts 12 bottles, 12 caps, 6.72g labels, 50g wrap per pack</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    1.5L PET Packs (6 bottles)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 100"
                    value={packs15L}
                    onChange={e => setPacks15L(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:border-emerald-500 outline-none"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Deducts 6 bottles, 6 caps, 7.86g labels, 50g wrap per pack</span>
                </div>
              </div>

              {/* Feature 4: Broken Bottles Entry */}
              <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200 space-y-3">
                <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Broken-Bottle Logging (Phase 3 Feature 4)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Broken 0.5L Bottles (pcs)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={brokenBottles05L}
                      onChange={e => setBrokenBottles05L(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-medium focus:border-rose-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Broken 1.5L Bottles (pcs)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={brokenBottles15L}
                      onChange={e => setBrokenBottles15L(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-medium focus:border-rose-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Feature 3: Formula Live Preview */}
              {(p05Num > 0 || p15Num > 0) && (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-emerald-600" />
                    Exact Auto-Deductions Live Formula Preview
                  </h4>
                  <div className="text-xs text-slate-700 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span>Total Water Treated:</span>
                      <span className="font-bold">{totalLitres} Litres</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mineral Set Fraction (15,140L capacity):</span>
                      <span className="font-bold">{mineralSetFraction} sets</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Calcium (2kg / set):</span>
                      <span>{(mineralSetFraction * 2).toFixed(4)} kg</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Magnesium (1kg / set):</span>
                      <span>{(mineralSetFraction * 1).toFixed(4)} kg</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Sodium (0.5kg / set):</span>
                      <span>{(mineralSetFraction * 0.5).toFixed(4)} kg</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Shrink Wrap (50g / pack):</span>
                      <span>{((p05Num + p15Num) * 0.050).toFixed(3)} kg</span>
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
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 font-semibold text-sm hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Executing Batch...' : 'Confirm & Deduct Materials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
