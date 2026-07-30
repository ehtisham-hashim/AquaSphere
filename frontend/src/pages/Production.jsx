import { useState, useEffect } from 'react';
import { 
  Factory, 
  AlertTriangle, 
  Plus, 
  X, 
  Scale, 
  RefreshCw,
  PackageCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { getCompanyFromCookie } from '../utils/companyCookie';
import { API_URL } from '../utils/api';

const API = API_URL;

export default function Production() {
  const tenant = getCompanyFromCookie();
  const isWadaana = tenant === 'wadaana';

  const [batches, setBatches] = useState([]);
  const [items, setItems] = useState([]);
  const [, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('batches'); // 'batches' | 'inventory'
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
        toast.success('Production Batch Logged Successfully (Pending)');
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
      bodyData = {
        brokenBottles05L: parseInt(brokenBottles05L || 0),
        brokenBottles15L: parseInt(brokenBottles15L || 0),
        wasteQuantity: parseInt(wasteQuantity || 0),
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

  // Preview Formulas Live (AquaSphere)
  const p05Num = parseInt(packs05L || 0);
  const p15Num = parseInt(packs15L || 0);
  const totalLitres = (p05Num * 9) + (p15Num * 12);
  const mineralSetFraction = (totalLitres / 15141).toFixed(6);

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

      {/* Navigation Tab Bar (Matching Orders.jsx Tab Bar UI) */}
      <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200/80 gap-1.5 w-fit">
        <button 
          onClick={() => setActiveTab('batches')}
          className={`px-5 py-2.5 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${
            activeTab === 'batches' 
              ? 'bg-white shadow-sm text-slate-800 border border-slate-200' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
          }`}
        >
          <Factory className="w-4 h-4 text-slate-600" />
          <span>Production Batches & Audit Trail</span>
          <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-black">
            {batches.length}
          </span>
        </button>

        <button 
          onClick={() => setActiveTab('inventory')}
          className={`px-5 py-2.5 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${
            activeTab === 'inventory' 
              ? 'bg-white shadow-sm text-slate-800 border border-slate-200' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
          }`}
        >
          <PackageCheck className={`w-4 h-4 ${isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'}`} />
          <span>Finished Goods Stock</span>
        </button>
      </div>

      {/* Finished Goods Stock Table (Visible when Finished Goods Stock Tab is active) */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <PackageCheck className={`w-5 h-5 ${isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'}`} />
                Finished Goods Available Stock
              </h3>
              <p className="text-xs text-slate-500">Live finished goods inventory levels updated from production output</p>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${isWadaana ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
              {isWadaana ? 'Bulk Single Preforms' : 'Packs & 19L Refills'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Finished Product</th>
                  <th className="p-3.5">Category / Specification</th>
                  <th className="p-3.5">Available Stock</th>
                  <th className="p-3.5">Reorder Alert Level</th>
                  <th className="p-3.5">Stock Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isWadaana ? (
                  /* Wadaana 4 Preform Bottle Rows */
                  [
                    { name: '0.5L Pure Preform Bottle (15g)', weight: '15g', type: 'Pure Preform', search: ['pure', '0.5'] },
                    { name: '1.5L Pure Preform Bottle (30g)', weight: '30g', type: 'Pure Preform', search: ['pure', '1.5'] },
                    { name: '0.5L Mix Preform Bottle (13g)', weight: '13g', type: 'Mix Preform', search: ['mix', '0.5'] },
                    { name: '1.5L Mix Preform Bottle (27g)', weight: '27g', type: 'Mix Preform', search: ['mix', '1.5'] },
                  ].map((p, idx) => {
                    const item = items.find(i => p.search.every(s => i.name.toLowerCase().includes(s)));
                    const qty = Number(item?.cachedQty || 0);
                    const reorder = Number(item?.reorderLevel || 100);
                    const isLow = qty <= reorder;

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-800">{p.name}</td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${p.type.includes('Pure') ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                            {p.type} &bull; {p.weight}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-base font-black text-slate-800">
                          {qty.toLocaleString()} <span className="text-xs font-normal text-slate-500">pcs</span>
                        </td>
                        <td className="p-3.5 font-mono text-xs font-semibold text-slate-500">{reorder} pcs</td>
                        <td className="p-3.5">
                          {isLow ? (
                            <span className="px-2.5 py-1 rounded text-rose-700 bg-rose-50 border border-rose-200 font-bold text-xs">Low Stock</span>
                          ) : (
                            <span className="px-2.5 py-1 rounded text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold text-xs">In Stock</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  /* AquaSphere 3 Product Rows */
                  [
                    { name: 'AquaSphere 0.5L PET Pack (12 bottles)', spec: '12 bottles / pack', type: '0.5L PET', search: ['0.5'] },
                    { name: 'AquaSphere 1.5L PET Pack (6 bottles)', spec: '6 bottles / pack', type: '1.5L PET', search: ['1.5'] },
                    { name: 'AquaSphere 19L PC Refill Bottle', spec: '24L water / bottle', type: '19L PC', search: ['19'] },
                  ].map((p, idx) => {
                    const item = items.find(i => i.type === 'FINISHED_GOOD' && i.name.toLowerCase().includes(p.search[0]));
                    const qty = Number(item?.cachedQty || 0);
                    const reorder = Number(item?.reorderLevel || 10);
                    const isLow = qty <= reorder;

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-800">{p.name}</td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {p.type} &bull; {p.spec}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-base font-black text-slate-800">
                          {qty.toLocaleString()} <span className="text-xs font-normal text-slate-500">{p.type.includes('19L') ? 'bottles' : 'packs'}</span>
                        </td>
                        <td className="p-3.5 font-mono text-xs font-semibold text-slate-500">{reorder} {p.type.includes('19L') ? 'bottles' : 'packs'}</td>
                        <td className="p-3.5">
                          {isLow ? (
                            <span className="px-2.5 py-1 rounded text-rose-700 bg-rose-50 border border-rose-200 font-bold text-xs">Low Stock</span>
                          ) : (
                            <span className="px-2.5 py-1 rounded text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold text-xs">In Stock</span>
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
      )}

      {/* Production History Table (Visible when Batches Tab is active) */}
      {activeTab === 'batches' && (
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={isWadaana ? "7" : "7"} className="p-8 text-center text-slate-400">No production batches recorded.</td>
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
                        </tr>
                      );
                    }

                    // AquaSphere Row
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
      )}

      {/* Log Production Run Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="sticky top-0 bg-slate-900 text-white px-6 py-4 flex justify-between items-center z-10">
              <div>
                <h3 className="text-lg font-bold">Log Factory Production Run</h3>
                <p className="text-xs text-slate-400">
                  {isWadaana ? 'Enter single bottle counts for Wadaana production.' : 'Enter pack counts — exact decimal auto-deductions are calculated automatically.'}
                </p>
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

              {/* Wadaana vs AquaSphere Product Inputs */}
              {isWadaana ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-cyan-700 uppercase mb-1">
                      0.5L Pure Bottles (15g)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 5000"
                      value={qtyPure05L}
                      onChange={e => setQtyPure05L(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:border-cyan-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-sky-700 uppercase mb-1">
                      1.5L Pure Bottles (30g)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 2500"
                      value={qtyPure15L}
                      onChange={e => setQtyPure15L(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:border-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-700 uppercase mb-1">
                      0.5L Mix Bottles (13g)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 3000"
                      value={qtyMix05L}
                      onChange={e => setQtyMix05L(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-orange-700 uppercase mb-1">
                      1.5L Mix Bottles (27g)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 1500"
                      value={qtyMix15L}
                      onChange={e => setQtyMix15L(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:border-orange-500 outline-none"
                    />
                  </div>
                </div>
              ) : (
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
              )}

              {/* AquaSphere Formula Live Preview */}
              {!isWadaana && (p05Num > 0 || p15Num > 0 || parseInt(quantity || 0) > 0) && (
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
                  className={`px-6 py-2.5 ${isWadaana ? 'bg-[#0ea5e9] hover:bg-sky-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50`}
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
    </div>
  );
}
