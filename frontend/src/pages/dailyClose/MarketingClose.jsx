import { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, Lock, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getCompanyFromCookie } from '../../utils/companyCookie';
import { API_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const API = API_URL;

export default function MarketingClose() {
  const { user } = useAuth();
  const tenant = getCompanyFromCookie();
  
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // MM Checklist State
  const [mmChecks, setMmChecks] = useState({
    ordersInRightState: false,
    customerBottlesInRightState: false
  });

  // Admin Checklist State
  const [adminChecks, setAdminChecks] = useState({
    ordersVerified: false,
    bottlesVerified: false,
    cashVerified: false
  });

  const isMM = user?.role === 'MARKETING_MANAGER' || user?.role === 'OWNER';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';

  const fetchStatus = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    setMmChecks({ ordersInRightState: false, customerBottlesInRightState: false });
    setAdminChecks({ ordersVerified: false, bottlesVerified: false, cashVerified: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, tenant]);

  const allMmChecked = Object.values(mmChecks).every(Boolean);
  const allAdminChecked = Object.values(adminChecks).every(Boolean);

  const handleMmConfirm = async () => {
    if (!allMmChecked) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/daily-close/mm-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant': tenant },
        credentials: 'include',
        body: JSON.stringify({ date })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Marketing & Sales confirmed successfully. Awaiting Admin verification.');
        fetchStatus();
      } else {
        toast.error(json.message || 'Failed to confirm MM daily close');
      }
    } catch (err) {
      toast.error('Error confirming MM daily close');
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
  const mmConfirmed = status?.mmConfirmed;
  const mTotals = status?.marketingTotals || {};

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Light Clean Header Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              SALES & MARKETING
            </span>
            <span className="text-xs text-slate-500">Two-Step Verification Protocol</span>
          </div>
          <h1 className="text-2xl font-bold mt-1 text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-600" /> Marketing Daily Close
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Coordinate Sales & Accounting to securely finalize daily records.
          </p>
        </div>
        
        <div>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-300 text-slate-800 rounded-xl text-sm font-semibold outline-none focus:border-purple-500 transition-colors"
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
            All records for {new Date(date).toLocaleDateString()} have been securely closed by {status?.closedBy?.name || 'Admin'} at {new Date(status?.closedAt).toLocaleTimeString()}. No further edits can be made.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* STEP 1: MM Verification */}
          <div className={`rounded-2xl border ${mmConfirmed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200 shadow-sm'} p-6 relative overflow-hidden`}>
            {mmConfirmed && (
              <div className="absolute top-4 right-4 text-emerald-600 flex items-center gap-1 text-sm font-bold bg-emerald-100 px-3 py-1 rounded-full">
                <CheckCircle2 size={16} /> Verified
              </div>
            )}
            <h3 className="text-lg font-bold text-slate-800 mb-1">Step 1: Sales & Marketing</h3>
            <p className="text-xs text-slate-500 mb-4">Verified by Marketing Manager</p>

            {/* Display System Recorded Stats */}
            <div className="bg-purple-50/40 p-4 rounded-xl border border-purple-100 mb-6">
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-2">System Recorded Sales & Bottles</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Total Orders:</p>
                  <p className="text-lg font-bold text-purple-950">{mTotals.ordersCount || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Orders Worth:</p>
                  <p className="text-lg font-bold text-emerald-700">Rs {Number(mTotals.ordersTotalWorth || 0).toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-600">19L With Customers:</p>
                  <p className="text-lg font-bold text-blue-900">{mTotals.customerBottlesCount || 0} bottles</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  disabled={mmConfirmed || !isMM}
                  checked={mmConfirmed || mmChecks.ordersInRightState}
                  onChange={e => setMmChecks(prev => ({ ...prev, ordersInRightState: e.target.checked }))}
                  className="mt-1 w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 disabled:opacity-50"
                />
                <span className={`text-sm ${mmConfirmed ? 'text-slate-500 line-through' : 'text-slate-700 font-medium group-hover:text-purple-700'}`}>
                  Orders are in the right state ({mTotals.ordersCount || 0} orders, total worth Rs {Number(mTotals.ordersTotalWorth || 0).toLocaleString()}).
                </span>
              </label>
              
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  disabled={mmConfirmed || !isMM}
                  checked={mmConfirmed || mmChecks.customerBottlesInRightState}
                  onChange={e => setMmChecks(prev => ({ ...prev, customerBottlesInRightState: e.target.checked }))}
                  className="mt-1 w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 disabled:opacity-50"
                />
                <span className={`text-sm ${mmConfirmed ? 'text-slate-500 line-through' : 'text-slate-700 font-medium group-hover:text-purple-700'}`}>
                  Customers hold the right state of bottles ({mTotals.customerBottlesCount || 0} x 19L bottles held by customers).
                </span>
              </label>
            </div>

            {isMM && !mmConfirmed && (
              <div className="mt-8">
                <button
                  onClick={handleMmConfirm}
                  disabled={!allMmChecked || submitting}
                  className="w-full py-3 px-4 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-200 text-white font-bold text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={18} />
                  Send to Admin for Verification
                </button>
              </div>
            )}
            
            {mmConfirmed && status?.mmConfirmedBy?.name && (
              <div className="mt-6 text-xs font-semibold text-emerald-700 bg-emerald-100/50 p-3 rounded-lg">
                Confirmed by {status.mmConfirmedBy.name} at {new Date(status.mmConfirmedAt).toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* STEP 2: Admin Verification */}
          <div className={`rounded-2xl border ${!mmConfirmed ? 'bg-slate-50 border-slate-200 opacity-60 pointer-events-none' : 'bg-white border-slate-200 shadow-sm'} p-6 relative overflow-hidden`}>
            {!mmConfirmed && (
              <div className="absolute top-4 right-4 text-amber-600 flex items-center gap-1 text-sm font-bold bg-amber-100 px-3 py-1 rounded-full">
                <AlertTriangle size={14} /> Locked
              </div>
            )}
            <h3 className="text-lg font-bold text-slate-800 mb-1">Step 2: Sales & Admin</h3>
            <p className="text-xs text-slate-500 mb-6">Verified by System Admin or Owner</p>

            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  disabled={!isAdmin}
                  checked={adminChecks.ordersVerified}
                  onChange={e => setAdminChecks(prev => ({ ...prev, ordersVerified: e.target.checked }))}
                  className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:opacity-50"
                />
                <span className="text-sm text-slate-700 font-medium group-hover:text-emerald-700">Order amounts match total revenue.</span>
              </label>
              
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  disabled={!isAdmin}
                  checked={adminChecks.bottlesVerified}
                  onChange={e => setAdminChecks(prev => ({ ...prev, bottlesVerified: e.target.checked }))}
                  className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:opacity-50"
                />
                <span className="text-sm text-slate-700 font-medium group-hover:text-emerald-700">Customer 19L bottle ledger balances verified.</span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  disabled={!isAdmin}
                  checked={adminChecks.cashVerified}
                  onChange={e => setAdminChecks(prev => ({ ...prev, cashVerified: e.target.checked }))}
                  className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:opacity-50"
                />
                <span className="text-sm text-slate-700 font-medium group-hover:text-emerald-700">Cash collected matches system deliveries.</span>
              </label>
            </div>

            {isAdmin && (
              <div className="mt-8">
                <button
                  onClick={handleAdminFinalize}
                  disabled={!allAdminChecked || submitting}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-200 disabled:text-emerald-500 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <Lock size={18} />
                  Finalize & Lock Daily Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
