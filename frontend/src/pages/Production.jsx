import { useState, useEffect } from 'react';
import { 
  Factory, 
  AlertTriangle, 
  Plus, 
  X, 
  Scale, 
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { getCompanyFromCookie } from '../utils/companyCookie';
import { API_URL } from '../utils/api';

const API = API_URL;

export default function Production() {
  const tenant = getCompanyFromCookie();


  const [batches, setBatches] = useState([]);
  const [items, setItems] = useState([]);
  const [, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State (§8 PM Spec)
  const [packs05L, setPacks05L] = useState('');
  const [packs15L, setPacks15L] = useState('');
  const [quantity, setQuantity] = useState(''); // 19L bottles

  // Complete Batch Modal State
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completingBatchId, setCompletingBatchId] = useState(null);
  const [brokenBottles05L, setBrokenBottles05L] = useState('');
  const [brokenBottles15L, setBrokenBottles15L] = useState('');
  const [wasteQuantity, setWasteQuantity] = useState(''); // Broken 19L
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, batchesRes, statsRes] = await Promise.all([
        fetch(`${API}/items`, { headers: { 'x-tenant': tenant }, credentials: 'include' }),
        fetch(`${API}/production`, { headers: { 'x-tenant': tenant }, credentials: 'include' }),
        fetch(`${API}/production/stats`, { headers: { 'x-tenant': tenant }, credentials: 'include' }).catch(() => ({ json: () => ({ success: true, data: null }) }))
      ]);

      const itemsData = await itemsRes.json();
      const batchesData = await batchesRes.json();
      const statsData = await statsRes.json();

      if (itemsData.success) {
        setItems(itemsData.data || []);
      }
      if (batchesData.success) {
        setBatches(batchesData.data || []);
      }
      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (err) {
      console.error('Error fetching PM production data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Submit Production Batch (§8 PM Feature 2 & 3)
  const handleLogBatch = async (e) => {
    e.preventDefault();
    const p05 = parseInt(packs05L || 0);
    const p15 = parseInt(packs15L || 0);
    const qty = parseInt(quantity || 0);

    if (p05 === 0 && p15 === 0 && qty === 0) {
      toast.error('Please enter at least one pack or 19L bottle quantity');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/production`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant': tenant 
        },
        credentials: 'include',
        body: JSON.stringify({
          packs05L: p05,
          packs15L: p15,
          quantity: qty,
          batchDate,
          notes
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Production Batch Logged Successfully (Pending)');
        setIsModalOpen(false);
        setPacks05L('');
        setPacks15L('');
        setQuantity('');
        setNotes('');
        fetchData();
      } else {
        toast.error(data.message || 'Failed to log batch');
      }
    } catch (err) {
      console.error(err);
      toast.error('Server error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteBatch = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/production/${completingBatchId}/complete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant': tenant 
        },
        credentials: 'include',
        body: JSON.stringify({
          brokenBottles05L: parseInt(brokenBottles05L || 0),
          brokenBottles15L: parseInt(brokenBottles15L || 0),
          wasteQuantity: parseInt(wasteQuantity || 0),
          confirmed: true
        })
      });

      const data = await res.json();
      if (data.success && !data.requiresConfirmation) {
        toast.success('Batch Completed & Inventory Updated');
        setIsCompleteModalOpen(false);
        setCompletingBatchId(null);
        setBrokenBottles05L('');
        setBrokenBottles15L('');
        setWasteQuantity('');
        fetchData();
      } else {
        toast.error(data.message || 'Failed to complete batch');
      }
    } catch (err) {
      console.error(err);
      toast.error('Server error');
    } finally {
      setSubmitting(false);
    }
  };

  // Preview Formulas Live
  const p05Num = parseInt(packs05L || 0);
  const p15Num = parseInt(packs15L || 0);
  const totalLitres = (p05Num * 9) + (p15Num * 12);
  const mineralSetFraction = (totalLitres / 15141).toFixed(6);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading Production Management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              PRODUCTION MANAGER
            </span>
            <span className="text-xs text-slate-500">Strict Chemical & Raw Material Formula Control</span>
          </div>
          <h1 className="text-2xl font-bold mt-2 text-slate-800">Factory Floor & Batch Execution</h1>
          <p className="text-sm text-slate-500 mt-1">
            Log pack output to trigger exact-decimal raw material auto-deductions and breakage tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">

          {/* Feature 2: Production Batch Entry Modal Trigger */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Log Production Batch
          </button>
        </div>
      </div>



      {/* Finished Goods Inventory Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Finished 0.5L Packs</span>
            <div className="text-xl font-black text-emerald-700">
              {(items.find(i => i.type === 'FINISHED_GOOD' && i.name.toLowerCase().includes('0.5'))?.cachedQty || 0).toLocaleString()} Packs
            </div>
            <span className="text-[11px] text-slate-500">12 bottles per pack (9L water)</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs">0.5L PET</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Finished 1.5L Packs</span>
            <div className="text-xl font-black text-purple-700">
              {(items.find(i => i.type === 'FINISHED_GOOD' && i.name.toLowerCase().includes('1.5'))?.cachedQty || 0).toLocaleString()} Packs
            </div>
            <span className="text-[11px] text-slate-500">6 bottles per pack (12L water)</span>
          </div>
          <div className="p-3 bg-purple-50 text-purple-700 rounded-xl font-bold text-xs">1.5L PET</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">19L Bottle Stock</span>
            <div className="text-xl font-black text-blue-900">
              {(items.find(i => i.type === 'FINISHED_GOOD' && i.name.toLowerCase().includes('19'))?.cachedQty || 0).toLocaleString()} Bottles
            </div>
            <span className="text-[11px] text-slate-500">24L water per refill bottle</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl font-bold text-xs">19L PC</div>
        </div>
      </div>
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
                <th className="p-3.5">Output (19L)</th>
                <th className="p-3.5">Total Water Treated</th>
                <th className="p-3.5">Breakage / Waste</th>
                <th className="p-3.5">Status</th>
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
                  const qty = b.quantity || 0;
                  const litres = (p05 * 6) + (p15 * 9) + (qty * 19);
                  const b05 = b.brokenBottles05L || 0;
                  const b15 = b.brokenBottles15L || 0;
                  const w19 = b.wasteQuantity || 0;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-slate-800">#{b.id.substring(0, 8).toUpperCase()}</span>
                        <span className="text-xs text-slate-400 block">{new Date(b.createdAt).toLocaleString()}</span>
                      </td>
                      <td className="p-3.5 font-bold text-emerald-600">+{p05} packs</td>
                      <td className="p-3.5 font-bold text-purple-600">+{p15} packs</td>
                      <td className="p-3.5 font-bold text-blue-600">+{qty} bottles</td>
                      <td className="p-3.5 font-mono font-medium text-slate-700">{litres} Litres</td>
                      <td className="p-3.5">
                        {(b05 > 0 || b15 > 0 || w19 > 0) ? (
                          <span className="text-rose-600 font-semibold text-xs bg-rose-50 px-2 py-1 rounded-md">
                            {b05 + b15 + w19} broken/waste
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Clean</span>
                        )}
                      </td>
                      <td className="p-3.5 text-xs">
                        {b.status === 'COMPLETED' ? (
                          <span className="px-2 py-1 rounded text-emerald-700 bg-emerald-50 border border-emerald-200 font-medium">Completed</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded text-amber-700 bg-amber-50 border border-amber-200 font-medium">Pending</span>
                            <button onClick={() => { setCompletingBatchId(b.id); setIsCompleteModalOpen(true); }} className="px-2 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-500 font-medium transition shadow-sm">
                              Confirm & Complete
                            </button>
                          </div>
                        )}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    0.5L PET Packs (12)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 200"
                    value={packs05L}
                    onChange={e => setPacks05L(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:border-emerald-500 outline-none"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">9L total water</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    1.5L PET Packs (6)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 100"
                    value={packs15L}
                    onChange={e => setPacks15L(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:border-emerald-500 outline-none"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">9L total water</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    19L PC Bottles
                  </label>
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

              {/* Feature 3: Formula Live Preview */}
              {(p05Num > 0 || p15Num > 0 || parseInt(quantity || 0) > 0) && (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-emerald-600" />
                    Exact Auto-Deductions Live Formula Preview
                  </h4>
                  <div className="text-xs text-slate-700 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span>Total Water Treated:</span>
                      <span className="font-bold">{totalLitres + (parseInt(quantity || 0) * 19)} Litres</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mineral Set Fraction (15,140L capacity):</span>
                      <span className="font-bold">{((totalLitres + (parseInt(quantity || 0) * 19)) / 15141).toFixed(6)} sets</span>
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
                      <span>{(((totalLitres + (parseInt(quantity || 0) * 19)) / 15141) * 0.5).toFixed(4)} kg</span>
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
                  {submitting ? 'Creating...' : 'Create Pending Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Batch Modal */}
      {isCompleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Confirm & Complete Batch</h3>
                <p className="text-xs text-slate-400">Log broken bottles and deduct raw materials.</p>
              </div>
              <button onClick={() => setIsCompleteModalOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCompleteBatch} className="p-6 space-y-6">
              <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200 space-y-3">
                <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Breakage During Batch
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Broken 0.5L (pcs)</label>
                    <input type="number" min="0" placeholder="0" value={brokenBottles05L} onChange={e => setBrokenBottles05L(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-medium focus:border-rose-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Broken 1.5L (pcs)</label>
                    <input type="number" min="0" placeholder="0" value={brokenBottles15L} onChange={e => setBrokenBottles15L(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-medium focus:border-rose-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Broken 19L (pcs)</label>
                    <input type="number" min="0" placeholder="0" value={wasteQuantity} onChange={e => setWasteQuantity(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-medium focus:border-rose-500 outline-none" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug pt-1">
                  These quantities will be deducted from empty bottle raw material stocks instead of becoming finished goods.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsCompleteModalOpen(false)} className="px-5 py-2 text-slate-600 font-semibold text-sm hover:bg-slate-100 rounded-xl">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50">
                  {submitting ? 'Completing...' : 'Complete Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
