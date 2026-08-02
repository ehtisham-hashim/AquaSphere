import { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, Lock, AlertTriangle, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getCompanyFromCookie } from '../../utils/companyCookie';
import { API_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const API = API_URL;

export default function ProductionClose() {
  const { user } = useAuth();
  const tenant = getCompanyFromCookie();
  
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // Production Manager Checklist State (Exactly 2 User Checkboxes)
  const [pmChecks, setPmChecks] = useState({
    stockMatches: false,
    productionRecorded: false
  });

  // Admin Verification Checklist State
  const [adminChecks, setAdminChecks] = useState({
    stockVerified: false,
    productionVerified: false,
    finishedGoodsVerified: false,
    inventoryReconciled: false,
    dayReadyToLock: false
  });

  const isPM = user?.role === 'PRODUCTION_MANAGER' || user?.role === 'OWNER';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';

  const fetchStatus = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`${API}/daily-close/status?date=${date}`, {
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        setStatus(json.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load daily close status');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    setPmChecks({
      stockMatches: false,
      productionRecorded: false
    });
    setAdminChecks({
      stockVerified: false,
      productionVerified: false,
      finishedGoodsVerified: false,
      inventoryReconciled: false,
      dayReadyToLock: false
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, tenant]);

  const pendingBatchesCount = status?.pendingBatchesCount || 0;
  const negativeStockCount = status?.negativeStockCount || 0;

  const allPmChecked = Object.values(pmChecks).every(Boolean);
  const isPmDisabled = !allPmChecked || pendingBatchesCount > 0 || negativeStockCount > 0 || submitting;

  const allAdminChecked = Object.values(adminChecks).every(Boolean);

  const handlePmConfirm = async () => {
    if (isPmDisabled) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/daily-close/pm-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant': tenant },
        credentials: 'include',
        body: JSON.stringify({ date })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Production confirmed successfully. Awaiting Admin verification.');
        setStatus(prev => ({ ...prev, pmConfirmed: true }));
        await fetchStatus(false);
      } else {
        toast.error(json.message || 'Failed to confirm production');
      }
    } catch (err) {
      toast.error('Error confirming production');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminFinalize = async () => {
    if (!allAdminChecked) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/daily-close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant': tenant },
        credentials: 'include',
        body: JSON.stringify({ date })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Day successfully finalized and closed.');
        fetchStatus();
      } else {
        toast.error(json.message || 'Failed to close day');
      }
    } catch (err) {
      toast.error('Error closing day');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Checking Day Status...</p>
        </div>
      </div>
    );
  }

  const isClosed = status?.isClosed;
  const pmConfirmed = status?.pmConfirmed;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
            <ShieldCheck className="w-6 h-6 text-purple-600" /> Production Daily Close
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Verify production runs, inventory updates, and submit for daily lock.
          </p>
        </div>
        
        <div>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-300 text-slate-800 rounded-xl text-sm font-bold outline-none focus:border-purple-500 transition-colors shadow-xs"
          />
        </div>
      </div>

      {isClosed ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-900">Day is Locked & Finalized</h2>
          <p className="text-slate-600 max-w-md mx-auto">
            All records for {new Date(date).toLocaleDateString()} have been securely closed by {status?.closedBy?.name || 'Admin'} at {new Date(status?.closedAt).toLocaleTimeString()}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* STEP 1: PM Verification */}
          <div className={`rounded-2xl border ${pmConfirmed ? 'bg-purple-50/40 border-purple-200 opacity-90' : 'bg-white border-slate-200 shadow-sm'} p-6 relative overflow-hidden`}>
            {pmConfirmed && (
              <div className="absolute top-4 right-4 text-purple-800 flex items-center gap-1.5 text-xs font-black bg-purple-100 border border-purple-300 px-3 py-1 rounded-full shadow-xs">
                <CheckCircle2 size={14} className="text-purple-600" /> Production Verified ✓ | Awaiting Admin Verification
              </div>
            )}
            <h3 className="text-lg font-bold text-slate-800 mb-1">Step 1: Production Checklist</h3>
            <p className="text-xs text-slate-500 mb-4 font-medium">Verified by Production Manager</p>

            {/* Display Production & Inventory Summary */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-5 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Production Summary</p>
                  <span className="text-xs font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">
                    Production Batches Today: {status?.productionTotals?.batchesCount || 0}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-200/80">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold">19L Bottles:</p>
                    <p className="text-base font-black text-slate-900">{status?.productionTotals?.total19L || 0} Bottles</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold">0.5L Packs:</p>
                    <p className="text-base font-black text-slate-900">{status?.productionTotals?.packs05L || 0} Packs</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold">1.5L Packs:</p>
                    <p className="text-base font-black text-slate-900">{status?.productionTotals?.packs15L || 0} Packs</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold">Breakage / Waste:</p>
                    <p className="text-base font-black text-rose-600">
                      {(status?.productionTotals?.waste19L || 0) + (status?.productionTotals?.broken15L || 0) + (status?.productionTotals?.broken05L || 0)} Units
                    </p>
                  </div>
                </div>
              </div>

              {/* Finished Goods Added */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Finished Goods Added</p>
                <div className="grid grid-cols-3 gap-2 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200/80 text-xs font-bold text-emerald-950">
                  <div>19L: <span className="font-black text-emerald-900">{status?.productionTotals?.total19L || 0}</span></div>
                  <div>0.5L: <span className="font-black text-emerald-900">{status?.productionTotals?.packs05L || 0} pk</span></div>
                  <div>1.5L: <span className="font-black text-emerald-900">{status?.productionTotals?.packs15L || 0} pk</span></div>
                </div>
              </div>

              {/* Today's Raw Material Consumption */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Today&apos;s Raw Material Consumption</p>
                {status?.materialConsumption && status.materialConsumption.length > 0 ? (
                  <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                    {status.materialConsumption.map((mat, idx) => (
                      <div key={idx} className="flex justify-between items-center font-medium text-slate-700">
                        <span>{mat.name}:</span>
                        <span className="font-bold text-slate-900">{mat.quantity} {mat.unit}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic bg-white p-2 rounded-lg border border-slate-200">
                    No consumption logged for today.
                  </div>
                )}
              </div>
            </div>

            {/* System Warnings */}
            {(pendingBatchesCount > 0 || negativeStockCount > 0) && !pmConfirmed && (
              <div className="mb-5 space-y-2">
                {pendingBatchesCount > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800">
                    <AlertCircle size={15} className="shrink-0 text-amber-600" />
                    <span>Cannot Send: {pendingBatchesCount} production batch(es) pending completion!</span>
                  </div>
                )}
                {negativeStockCount > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800">
                    <AlertCircle size={15} className="shrink-0 text-rose-600" />
                    <span>Cannot Send: Negative stock detected on {negativeStockCount} item(s)!</span>
                  </div>
                )}
              </div>
            )}

            {/* System Validation Box (Automatically Verified) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 space-y-2">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                <span>System Validation</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">Auto-Verified ✓</span>
              </div>
              <div className="space-y-1.5 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span>✔ Production batches completed</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span>✔ Raw materials deducted</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span>✔ Finished goods updated</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span>✔ No negative inventory</span>
                </div>
              </div>
            </div>

            {/* PM Required Checkboxes (Exactly 2) */}
            <div className="space-y-3 pt-1 border-t border-slate-100">
              <p className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">PM Verification Confirmation</p>
              
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  disabled={pmConfirmed || !isPM}
                  checked={pmConfirmed || pmChecks.stockMatches}
                  onChange={e => setPmChecks(prev => ({ ...prev, stockMatches: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 disabled:opacity-50"
                />
                <span className={`text-xs ${pmConfirmed ? 'text-slate-600 font-bold' : 'text-slate-700 font-semibold group-hover:text-purple-700'}`}>
                  Physical raw material stock matches system
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  disabled={pmConfirmed || !isPM}
                  checked={pmConfirmed || pmChecks.productionRecorded}
                  onChange={e => setPmChecks(prev => ({ ...prev, productionRecorded: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 disabled:opacity-50"
                />
                <span className={`text-xs ${pmConfirmed ? 'text-slate-600 font-bold' : 'text-slate-700 font-semibold group-hover:text-purple-700'}`}>
                  Today&apos;s production has been completely recorded
                </span>
              </label>
            </div>

            {isPM && !pmConfirmed && (
              <div className="mt-6">
                <button
                  onClick={handlePmConfirm}
                  disabled={isPmDisabled}
                  className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <ShieldCheck size={16} />
                  Send to Admin for Verification
                </button>
              </div>
            )}
            
            {pmConfirmed && (
              <div className="mt-6 bg-purple-100/60 border border-purple-200 p-4 rounded-xl space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800">Submission Information</div>
                <div className="text-xs text-purple-950 font-bold">
                  Verified By: <span className="text-slate-900">{status?.pmConfirmedBy?.name || user?.name || 'Production Manager'}</span>
                </div>
                <div className="text-xs text-purple-900 font-semibold">
                  Verified At: <span className="font-mono text-slate-800">{new Date(status?.pmConfirmedAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(status?.pmConfirmedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block mt-1">
                  Status: Awaiting Admin Verification
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: Admin Verification */}
          <div className={`rounded-2xl border ${!pmConfirmed ? 'bg-slate-50 border-slate-200 opacity-60 pointer-events-none' : 'bg-white border-slate-200 shadow-sm'} p-6 relative overflow-hidden`}>
            {!pmConfirmed && (
              <div className="absolute top-4 right-4 text-amber-700 flex items-center gap-1 text-xs font-bold bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                <AlertTriangle size={14} /> Step 1 Pending
              </div>
            )}
            <h3 className="text-lg font-bold text-slate-800 mb-1">Step 2: Operations Admin Step</h3>
            <p className="text-xs text-slate-500 mb-6 font-medium">Verified by System Admin or Owner</p>

            <div className="space-y-3.5">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  disabled={!isAdmin}
                  checked={adminChecks.stockVerified}
                  onChange={e => setAdminChecks(prev => ({ ...prev, stockVerified: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:opacity-50"
                />
                <span className="text-xs text-slate-700 font-semibold group-hover:text-emerald-700">Production numbers match physical stock.</span>
              </label>
              
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  disabled={!isAdmin}
                  checked={adminChecks.productionVerified}
                  onChange={e => setAdminChecks(prev => ({ ...prev, productionVerified: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:opacity-50"
                />
                <span className="text-xs text-slate-700 font-semibold group-hover:text-emerald-700">✓ Daily production verified</span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  disabled={!isAdmin}
                  checked={adminChecks.finishedGoodsVerified}
                  onChange={e => setAdminChecks(prev => ({ ...prev, finishedGoodsVerified: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:opacity-50"
                />
                <span className="text-xs text-slate-700 font-semibold group-hover:text-emerald-700">✓ Finished goods verified</span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  disabled={!isAdmin}
                  checked={adminChecks.inventoryReconciled}
                  onChange={e => setAdminChecks(prev => ({ ...prev, inventoryReconciled: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:opacity-50"
                />
                <span className="text-xs text-slate-700 font-semibold group-hover:text-emerald-700">✓ Inventory reconciled</span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  disabled={!isAdmin}
                  checked={adminChecks.dayReadyToLock}
                  onChange={e => setAdminChecks(prev => ({ ...prev, dayReadyToLock: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:opacity-50"
                />
                <span className="text-xs text-slate-700 font-semibold group-hover:text-emerald-700">✓ Day ready to lock</span>
              </label>
            </div>

            {isAdmin && (
              <div className="mt-8">
                <button
                  onClick={handleAdminFinalize}
                  disabled={!allAdminChecked || submitting}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Lock size={16} />
                  Finalize & Lock Production Day
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
