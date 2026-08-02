import { useState, useEffect } from 'react';
import { 
  Factory, 
  AlertTriangle, 
  Plus, 
  X, 
  Scale, 
  RefreshCw,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { getCompanyFromCookie } from '../utils/companyCookie';
import { API_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import DeleteConfirmationModal from '../components/ui/DeleteConfirmationModal';

const API = API_URL;

export default function Production() {
  const tenant = getCompanyFromCookie();
  const isWadaana = tenant === 'wadaana';
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const [batches, setBatches] = useState([]);
  const [items, setItems] = useState([]);
  const [, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State (AquaSphere)
  const [packs05L, setPacks05L] = useState('');
  const [packs15L, setPacks15L] = useState('');
  const [quantity, setQuantity] = useState(''); // 19L bottles

  // Form State (Wadaana 4 Single Bottles)
  const [qtyPure05L, setQtyPure05L] = useState('');
  const [qtyPure15L, setQtyPure15L] = useState('');
  const [qtyMix05L, setQtyMix05L] = useState('');
  const [qtyMix15L, setQtyMix15L] = useState('');

  // Complete Batch Modal State
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completingBatchId, setCompletingBatchId] = useState(null);
  const [brokenBottles05L, setBrokenBottles05L] = useState('');
  const [brokenBottles15L, setBrokenBottles15L] = useState('');
  const [wasteQuantity, setWasteQuantity] = useState('');
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

  // Submit Production Batch
  const handleLogBatch = async (e) => {
    e.preventDefault();

    let payload = { batchDate, notes };

    if (isWadaana) {
      const p05 = parseInt(qtyPure05L || 0);
      const p15 = parseInt(qtyPure15L || 0);
      const m05 = parseInt(qtyMix05L || 0);
      const m15 = parseInt(qtyMix15L || 0);

      if (p05 === 0 && p15 === 0 && m05 === 0 && m15 === 0) {
        toast.error('Please enter at least one bottle quantity to produce');
        return;
      }

      payload = {
        ...payload,
        qtyPure05L: p05,
        qtyPure15L: p15,
        qtyMix05L: m05,
        qtyMix15L: m15
      };
    } else {
      const p05 = parseInt(packs05L || 0);
      const p15 = parseInt(packs15L || 0);
      const qty = parseInt(quantity || 0);

      if (p05 === 0 && p15 === 0 && qty === 0) {
        toast.error('Please enter at least one pack or 19L bottle quantity');
        return;
      }

      payload = {
        ...payload,
        packs05L: p05,
        packs15L: p15,
        quantity: qty
      };
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
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Production Batch Recorded (Pending Verification)');
        setIsModalOpen(false);
        setPacks05L('');
        setPacks15L('');
        setQuantity('');
        setQtyPure05L('');
        setQtyPure15L('');
        setQtyMix05L('');
        setQtyMix15L('');
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

  // Wadaana Broken State
  const [brokenPure05L, setBrokenPure05L] = useState('');
  const [brokenPure15L, setBrokenPure15L] = useState('');
  const [brokenMix05L, setBrokenMix05L] = useState('');
  const [brokenMix15L, setBrokenMix15L] = useState('');

  const batchToComplete = batches.find(b => b.id === completingBatchId);

  const handleCompleteBatch = async (e) => {
    e.preventDefault();

    let bodyData = {};

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

      bodyData = {
        brokenPure05L: brP05,
        brokenPure15L: brP15,
        brokenMix05L: brM05,
        brokenMix15L: brM15,
        confirmed: true
      };
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

      bodyData = {
        brokenBottles05L: br05,
        brokenBottles15L: br15,
        wasteQuantity: w19,
        confirmed: true
      };
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/production/${completingBatchId}/complete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant': tenant 
        },
        credentials: 'include',
        body: JSON.stringify(bodyData)
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Batch Completed & Inventory Updated');
        setIsCompleteModalOpen(false);
        setCompletingBatchId(null);
        setBrokenBottles05L('');
        setBrokenBottles15L('');
        setWasteQuantity('');
        setBrokenPure05L('');
        setBrokenPure15L('');
        setBrokenMix05L('');
        setBrokenMix15L('');
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

  // Delete Batch Modal State
  const [batchToDelete, setBatchToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Preview Formulas Live (AquaSphere)
  const p05Num = parseInt(packs05L || 0);
  const p15Num = parseInt(packs15L || 0);
  const totalLitres = (p05Num * 9) + (p15Num * 12);
  const mineralSetFraction = (totalLitres / 15141).toFixed(6);

  const handleConfirmDeleteBatch = async () => {
    if (!batchToDelete) return;
    if (!isOwner) {
      toast.error('Only Owner can delete production batches.');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`${API}/production/${batchToDelete.id}`, {
        method: 'DELETE',
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || 'Failed to delete production batch');
        return;
      }
      toast.success('Production batch deleted successfully.');
      setBatchToDelete(null);
      fetchData();
    } catch (err) {
      toast.error('Error deleting production batch');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className={`w-8 h-8 ${isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'} animate-spin`} />
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
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${isWadaana ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
              {isWadaana ? 'WADAANA PRODUCTION' : 'PRODUCTION MANAGER'}
            </span>
            <span className="text-xs text-slate-500">
              {isWadaana ? 'Factory Single Bottle Production Floor' : 'Strict Chemical & Raw Material Formula Control'}
            </span>
          </div>
          <h1 className="text-2xl font-bold mt-2 text-slate-800">Factory Floor & Batch Execution</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isWadaana ? 'Log single preform bottle production runs in bulk.' : 'Log pack output to trigger exact-decimal raw material auto-deductions and breakage tracking.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className={`px-5 py-2.5 ${isWadaana ? 'bg-[#0ea5e9] hover:bg-sky-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center gap-2`}
          >
            <Plus className="w-5 h-5" />
            Log Production Batch
          </button>
        </div>
      </div>

      {/* Production Inventory & Stock Alerts Banner */}
      {(() => {
        const lowItems = items.filter(i => 
          !i.archivedAt && 
          Number(i.reorderLevel) > 0 && 
          Number(i.cachedQty || 0) <= Number(i.reorderLevel)
        );
        if (lowItems.length === 0) return null;

        return (
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span>Production Inventory & Low Stock Alerts ({lowItems.length})</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {lowItems.map(item => (
                <span key={item.id} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  {item.name}: {Number(item.cachedQty || 0).toLocaleString()} {item.unit || 'pcs'} remaining
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Production History & Batch Audit Trail Table */}

      {/* Production History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Factory className="w-5 h-5 text-slate-600" />
              Production History & Batch Audit Trail
            </h3>
            <p className="text-xs text-slate-500">Read-only audit log of past production runs</p>
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
                {!isWadaana ? (
                  <>
                    <th className="p-3.5">Output (0.5L Packs)</th>
                    <th className="p-3.5">Output (1.5L Packs)</th>
                    <th className="p-3.5">Output (19L)</th>
                    <th className="p-3.5">Total Water Treated</th>
                  </>
                ) : (
                  <>
                    <th className="p-3.5">0.5L Pure</th>
                    <th className="p-3.5">1.5L Pure</th>
                    <th className="p-3.5">0.5L Mix</th>
                    <th className="p-3.5">1.5L Mix</th>
                    <th className="p-3.5">Total Output</th>
                  </>
                )}
                {!isWadaana && <th className="p-3.5">Breakage / Waste</th>}
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Recorded By</th>
                {isOwner && <th className="p-3.5 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={isOwner ? (isWadaana ? "9" : "9") : (isWadaana ? "8" : "8")} className="p-8 text-center text-slate-400">No production batches recorded.</td>
                </tr>
              ) : (
                batches.map(b => {
                  if (isWadaana) {
                    const p05 = b.qtyPure05L || 0;
                    const p15 = b.qtyPure15L || 0;
                    const m05 = b.qtyMix05L || 0;
                    const m15 = b.qtyMix15L || 0;
                    const totalBottles = p05 + p15 + m05 + m15;

                    return (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-3.5">
                          <span className="font-mono font-bold text-slate-800">#{b.id.substring(0, 8).toUpperCase()}</span>
                          <span className="text-xs text-slate-400 block">{new Date(b.createdAt).toLocaleString()}</span>
                        </td>
                        <td className="p-3.5 font-bold text-cyan-600">+{p05} pcs</td>
                        <td className="p-3.5 font-bold text-sky-600">+{p15} pcs</td>
                        <td className="p-3.5 font-bold text-amber-600">+{m05} pcs</td>
                        <td className="p-3.5 font-bold text-orange-600">+{m15} pcs</td>
                        <td className="p-3.5 font-bold text-slate-800">{totalBottles.toLocaleString()} Bottles</td>
                        <td className="p-3.5 text-xs">
                          {b.status === 'COMPLETED' ? (
                            <span className="px-2 py-1 rounded text-emerald-700 bg-emerald-50 border border-emerald-200 font-medium">Completed</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 rounded text-amber-700 bg-amber-50 border border-amber-200 font-medium">Pending</span>
                              <button onClick={() => { setCompletingBatchId(b.id); setIsCompleteModalOpen(true); }} className="px-2 py-1 bg-[#0ea5e9] text-white rounded text-xs hover:bg-sky-500 font-medium transition shadow-sm">
                                Confirm & Complete
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-xs text-slate-600 font-medium">
                          {b.createdBy?.name || user?.name || 'System'} ({b.createdBy?.role || 'MM'})
                        </td>
                        {isOwner && (
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => setBatchToDelete(b)}
                              title="Delete Batch (Owner Only)"
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  }

                  // AquaSphere Row
                  const p05 = b.packs05L || 0;
                  const p15 = b.packs15L || 0;
                  const qty = b.quantity || 0;
                  const litres = (p05 * 9) + (p15 * 12) + (qty * 24);
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
                          <span className="text-rose-600 font-semibold text-xs bg-rose-50 px-2 py-1 rounded-md" title={`0.5L: ${b05} | 1.5L: ${b15} | 19L: ${w19}`}>
                            {b05 + b15 + w19} broken/waste ({b05 ? `${b05}x0.5L ` : ''}{b15 ? `${b15}x1.5L ` : ''}{w19 ? `${w19}x19L` : ''})
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Clean</span>
                        )}
                      </td>
                      <td className="p-3.5 text-xs">
                        {b.status === 'COMPLETED' ? (
                          <div className="space-y-0.5">
                            <span className="px-2.5 py-0.5 rounded-full text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold text-xs inline-flex items-center gap-1">
                              ✓ Completed
                            </span>
                            <div className="text-[10px] text-slate-500 font-semibold mt-1">
                              Verified By: <span className="text-slate-800 font-bold">{b.completedBy?.name || user?.name || 'Admin'}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              Verified On: {new Date(b.updatedAt || b.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full text-amber-800 bg-amber-50 border border-amber-200 font-bold text-xs">Pending Verification</span>
                            <button onClick={() => { setCompletingBatchId(b.id); setIsCompleteModalOpen(true); }} className="px-2 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-500 font-medium transition shadow-sm">
                              Confirm & Complete
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-xs text-slate-600 font-medium">
                        {b.createdBy?.name || user?.name || 'System'} ({b.createdBy?.role || 'MM'})
                      </td>
                      {isOwner && (
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => setBatchToDelete(b)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Batch (Owner)"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Production Run Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="sticky top-0 bg-slate-900 text-white px-6 py-4 flex justify-between items-center z-10">
              <div>
                <h3 className="text-lg font-bold">Record Factory Production Batch</h3>
                <p className="text-xs text-slate-400">
                  {isWadaana ? 'Enter single bottle counts. Recorded batches are locked for audit verification.' : 'Enter pack counts — exact auto-deductions are calculated automatically and locked upon recording.'}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLogBatch} className="p-6 space-y-6">
              {/* Date & Auto-Generated Batch Number */}
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
                    <span>{isWadaana ? 'WB' : 'AQ'}-{batchDate ? batchDate.replace(/-/g, '') : 'YYYYMMDD'}-{String((batches.length || 0) + 1).padStart(3, '0')}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-200 px-2 py-0.5 rounded">Read-Only</span>
                  </div>
                </div>
              </div>

              {/* Wadaana vs AquaSphere Product Inputs */}
              {isWadaana ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-cyan-700 uppercase mb-1">
                      0.5L Pure Bottles (15g)
                    </label>
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
                    <label className="block text-xs font-bold text-sky-700 uppercase mb-1">
                      1.5L Pure Bottles (30g)
                    </label>
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
                    <label className="block text-xs font-bold text-amber-700 uppercase mb-1">
                      0.5L Mix Bottles (13g)
                    </label>
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
                    <label className="block text-xs font-bold text-orange-700 uppercase mb-1">
                      1.5L Mix Bottles (27g)
                    </label>
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
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      0.5L PET Pack (12 Bottles)
                    </label>
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
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      1.5L PET Pack (6 Bottles)
                    </label>
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
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      19L Refill Bottle
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
              )}

              {/* AquaSphere Formula Live Preview */}
              {!isWadaana && (p05Num > 0 || p15Num > 0 || parseInt(quantity || 0) > 0) && (() => {
                const totalWater = (p05Num * 9) + (p15Num * 12) + (parseInt(quantity || 0) * 24);
                const mineralFrac = totalWater / 15141;
                const caKg = (mineralFrac * 2).toFixed(4);
                const mgKg = (mineralFrac * 1).toFixed(4);
                const naKg = (mineralFrac * 0.5).toFixed(4);
                // Shrink wrap: 0.02273 kg per 0.5L pack, 0.025 kg per 1.5L pack
                const shrinkKg = ((p05Num * 0.02273) + (p15Num * 0.025)).toFixed(4);
                const empty05LCount = p05Num * 12;
                const empty15LCount = p15Num * 6;
                const empty19LCount = parseInt(quantity || 0);
                const capsCount = (p05Num * 12) + (p15Num * 6);
                const labels05LKg = (p05Num * 0.00672).toFixed(4);
                const labels15LKg = (p15Num * 0.00780).toFixed(4);

                // Stock Lookups from items state
                const getItemQty = (keywords) => {
                  const item = items.find(i => i.type === 'RAW_MATERIAL' && keywords.some(kw => i.name.toLowerCase().includes(kw.toLowerCase())));
                  return item ? Number(item.cachedQty || 0) : 0;
                };

                const empty05LStock = getItemQty(['500ml', '0.5l']);
                const empty15LStock = getItemQty(['1.5l', '1500ml']);
                const empty19LStock = getItemQty(['empty 19l', '19l']);
                const capsStock = getItemQty(['cap']);
                const shrinkStock = getItemQty(['shrink']);
                const naStock = getItemQty(['sodium']);
                const caStock = getItemQty(['calcium']);
                const mgStock = getItemQty(['magnesium']);

                const is05LShort = empty05LCount > 0 && empty05LStock < empty05LCount;
                const is15LShort = empty15LCount > 0 && empty15LStock < empty15LCount;
                const is19LShort = empty19LCount > 0 && empty19LStock < empty19LCount;
                const isCapsShort = capsCount > 0 && capsStock < capsCount;
                const isShrinkShort = Number(shrinkKg) > 0 && shrinkStock < Number(shrinkKg);
                const isNaShort = Number(naKg) > 0 && naStock < Number(naKg);
                const isCaShort = Number(caKg) > 0 && caStock < Number(caKg);
                const isMgShort = Number(mgKg) > 0 && mgStock < Number(mgKg);

                const hasShortage = is05LShort || is15LShort || is19LShort || isCapsShort || isShrinkShort || isNaShort || isCaShort || isMgShort;

                return (
                  <div className={`border rounded-xl p-4 space-y-2.5 transition-colors ${hasShortage ? 'bg-amber-50/90 border-amber-300' : 'bg-emerald-50/70 border-emerald-200'}`}>
                    <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                      <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${hasShortage ? 'text-amber-800' : 'text-emerald-800'}`}>
                        <Scale className={`w-4 h-4 ${hasShortage ? 'text-amber-600' : 'text-emerald-600'}`} />
                        Auto-Deduction & Live Material Stock Preview
                      </h4>
                      {hasShortage ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                          ⚠️ Insufficient Stock Alert
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                          ✓ All Raw Materials Available
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-700 space-y-1.5 font-mono">
                      <div className="flex justify-between font-bold text-emerald-900">
                        <span>Total Water Treated:</span>
                        <span>{totalWater} Litres</span>
                      </div>

                      {empty05LCount > 0 && (
                        <div className="flex justify-between items-center">
                          <span>Empty 0.5L PET Bottles ({empty05LCount} pcs):</span>
                          <span className={is05LShort ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                            {is05LShort ? `❌ Stock: ${empty05LStock} pcs` : `✓ In Stock (${empty05LStock} pcs)`}
                          </span>
                        </div>
                      )}

                      {empty15LCount > 0 && (
                        <div className="flex justify-between items-center">
                          <span>Empty 1.5L PET Bottles ({empty15LCount} pcs):</span>
                          <span className={is15LShort ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                            {is15LShort ? `❌ Stock: ${empty15LStock} pcs` : `✓ In Stock (${empty15LStock} pcs)`}
                          </span>
                        </div>
                      )}

                      {empty19LCount > 0 && (
                        <div className="flex justify-between items-center">
                          <span>Empty 19L Bottles ({empty19LCount} pcs):</span>
                          <span className={is19LShort ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                            {is19LShort ? `❌ Stock: ${empty19LStock} pcs` : `✓ In Stock (${empty19LStock} pcs)`}
                          </span>
                        </div>
                      )}

                      {capsCount > 0 && (
                        <div className="flex justify-between items-center">
                          <span>Small Caps ({capsCount} pcs):</span>
                          <span className={isCapsShort ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                            {isCapsShort ? `❌ Stock: ${capsStock} pcs` : `✓ In Stock (${capsStock} pcs)`}
                          </span>
                        </div>
                      )}

                      {(p05Num > 0 || p15Num > 0) && (
                        <div className="flex justify-between items-center">
                          <span>Labels ({p05Num > 0 ? `${labels05LKg}kg` : ''}{p05Num > 0 && p15Num > 0 ? ' + ' : ''}{p15Num > 0 ? `${labels15LKg}kg` : ''}):</span>
                          <span className="text-slate-600">✓ In Stock</span>
                        </div>
                      )}

                      {(p05Num > 0 || p15Num > 0) && (
                        <div className="flex justify-between items-center">
                          <span>Shrink Wrap ({shrinkKg} kg):</span>
                          <span className={isShrinkShort ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                            {isShrinkShort ? `❌ Stock: ${shrinkStock} kg` : `✓ In Stock (${shrinkStock} kg)`}
                          </span>
                        </div>
                      )}

                      {totalWater > 0 && (
                        <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                          <span>Minerals (Ca: {caKg}kg, Mg: {mgKg}kg, Na: {naKg}kg):</span>
                          <span className={(isNaShort || isCaShort || isMgShort) ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                            {(isNaShort || isCaShort || isMgShort) ? '❌ Stock Shortage' : '✓ In Stock'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Wadaana Formula & Stock Validation Live Preview */}
              {isWadaana && (() => {
                const p05 = parseInt(qtyPure05L || 0);
                const p15 = parseInt(qtyPure15L || 0);
                const m05 = parseInt(qtyMix05L || 0);
                const m15 = parseInt(qtyMix15L || 0);
                const totalWadaanaBottles = p05 + p15 + m05 + m15;

                const pure05Kg = (p05 * 0.015);
                const pure15Kg = (p15 * 0.030);
                const mix05Kg = (m05 * 0.013);
                const mix15Kg = (m15 * 0.027);

                const totalPureKg = pure05Kg + pure15Kg;
                const totalMixKg = mix05Kg + mix15Kg;

                const getItemQty = (keywords) => {
                  const item = items.find(i => i.type === 'RAW_MATERIAL' && keywords.some(kw => i.name.toLowerCase().includes(kw.toLowerCase())));
                  return item ? Number(item.cachedQty || 0) : 0;
                };

                const purePreformStock = getItemQty(['pure preform', 'pure']);
                const mixPreformStock = getItemQty(['mix preform', 'mix']);

                const isPureShort = totalPureKg > 0 && purePreformStock < totalPureKg;
                const isMixShort = totalMixKg > 0 && mixPreformStock < totalMixKg;
                const hasWadaanaShortage = isPureShort || isMixShort;

                if (totalWadaanaBottles === 0) return null;

                return (
                  <div className={`border rounded-2xl p-4 space-y-3 transition-colors ${hasWadaanaShortage ? 'bg-rose-50/90 border-rose-300' : 'bg-sky-50/80 border-sky-200'}`}>
                    {/* Header & Total Output */}
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

                    {/* Finished Goods Generated Preview */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200/90 space-y-2">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                        Finished Goods Generated
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
                        {p05 > 0 && (
                          <div className="bg-cyan-50 border border-cyan-200 p-2 rounded-lg text-cyan-950">
                            <span className="text-[10px] text-cyan-700 block uppercase">0.5L Pure</span>
                            <span className="text-sm font-black">{p05.toLocaleString()}</span>
                          </div>
                        )}
                        {p15 > 0 && (
                          <div className="bg-sky-50 border border-sky-200 p-2 rounded-lg text-sky-950">
                            <span className="text-[10px] text-sky-700 block uppercase">1.5L Pure</span>
                            <span className="text-sm font-black">{p15.toLocaleString()}</span>
                          </div>
                        )}
                        {m05 > 0 && (
                          <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg text-amber-950">
                            <span className="text-[10px] text-amber-700 block uppercase">0.5L Mix</span>
                            <span className="text-sm font-black">{m05.toLocaleString()}</span>
                          </div>
                        )}
                        {m15 > 0 && (
                          <div className="bg-orange-50 border border-orange-200 p-2 rounded-lg text-orange-950">
                            <span className="text-[10px] text-orange-700 block uppercase">1.5L Mix</span>
                            <span className="text-sm font-black">{m15.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Preform Consumption Preview (Automatic Calculation: bottles x grams = kg) */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200/90 text-xs font-mono space-y-2">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1 flex justify-between items-center">
                        <span>Preform Auto-Deductions</span>
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">Auto-Calculated ✓</span>
                      </div>

                      {p05 > 0 && (
                        <div className="flex justify-between items-center text-cyan-900">
                          <span>0.5L Pure ({p05.toLocaleString()} × 15g):</span>
                          <span className="font-bold">Consumes: {pure05Kg.toFixed(2)} kg Pure Preform</span>
                        </div>
                      )}

                      {p15 > 0 && (
                        <div className="flex justify-between items-center text-sky-900">
                          <span>1.5L Pure ({p15.toLocaleString()} × 30g):</span>
                          <span className="font-bold">Consumes: {pure15Kg.toFixed(2)} kg Pure Preform</span>
                        </div>
                      )}

                      {m05 > 0 && (
                        <div className="flex justify-between items-center text-amber-900">
                          <span>0.5L Mix ({m05.toLocaleString()} × 13g):</span>
                          <span className="font-bold">Consumes: {mix05Kg.toFixed(2)} kg Mix Preform</span>
                        </div>
                      )}

                      {m15 > 0 && (
                        <div className="flex justify-between items-center text-orange-900">
                          <span>1.5L Mix ({m15.toLocaleString()} × 27g):</span>
                          <span className="font-bold">Consumes: {mix15Kg.toFixed(2)} kg Mix Preform</span>
                        </div>
                      )}
                    </div>

                    {/* Stock Validation Checklist & Hard Safeguard */}
                    <div className="space-y-1.5 text-xs font-bold pt-1">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Stock Validation Safeguard</div>
                      
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

                      <div className="flex items-center gap-2 p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs">
                        <span>✓ Finished Goods can be updated</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
                  disabled={submitting || (isWadaana ? (
                    ((parseInt(qtyPure05L || 0) * 0.015 + parseInt(qtyPure15L || 0) * 0.030) > 0 && (items.find(i => i.type === 'RAW_MATERIAL' && (i.name.toLowerCase().includes('pure preform') || i.name.toLowerCase().includes('pure')))?.cachedQty || 0) < (parseInt(qtyPure05L || 0) * 0.015 + parseInt(qtyPure15L || 0) * 0.030)) ||
                    ((parseInt(qtyMix05L || 0) * 0.013 + parseInt(qtyMix15L || 0) * 0.027) > 0 && (items.find(i => i.type === 'RAW_MATERIAL' && (i.name.toLowerCase().includes('mix preform') || i.name.toLowerCase().includes('mix')))?.cachedQty || 0) < (parseInt(qtyMix05L || 0) * 0.013 + parseInt(qtyMix15L || 0) * 0.027))
                  ) : false)}
                  className={`px-6 py-2.5 ${isWadaana ? 'bg-[#0ea5e9] hover:bg-sky-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {submitting ? 'Recording Batch...' : 'Record Production Batch'}
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
                <p className="text-xs text-slate-400">Complete production batch and update inventory.</p>
              </div>
              <button onClick={() => setIsCompleteModalOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCompleteBatch} className="p-6 space-y-6">
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
                <button type="button" onClick={() => setIsCompleteModalOpen(false)} className="px-5 py-2 text-slate-600 font-semibold text-sm hover:bg-slate-100 rounded-xl">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className={`px-6 py-2 ${isWadaana ? 'bg-[#0ea5e9] hover:bg-sky-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50`}>
                  {submitting ? 'Completing...' : 'Complete Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={Boolean(batchToDelete)}
        title="Delete Production Batch"
        message={`Are you sure you want to delete Production Batch #${batchToDelete?.id?.substring(0, 8).toUpperCase()}? This will revert any associated inventory additions and raw material consumptions.`}
        confirmText="Delete Batch"
        cancelText="Cancel"
        loading={isDeleting}
        onConfirm={handleConfirmDeleteBatch}
        onClose={() => setBatchToDelete(null)}
      />
    </div>
  );
}
