import { useState, useEffect } from 'react';
import { X, Lock, Unlock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DailyCloseModal({ onClose, onClosed }) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [checks, setChecks] = useState({
    stock: false,
    production: false,
    route: false
  });
  
  const [reopenReason, setReopenReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/daily-close/summary`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setMetrics(data.data);
      } else {
        setError(data.message || 'Failed to load daily metrics');
      }
    } catch (err) {
      setError('Network error loading metrics');
    } finally {
      setLoading(false);
    }
  };

  const allChecked = checks.stock && checks.production && checks.route;

  const handleCloseDay = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/daily-close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        if (onClosed) onClosed();
        onClose();
      } else {
        setError(data.message || 'Failed to close day');
      }
    } catch (err) {
      setError('Network error during daily close');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReopenDay = async () => {
    if (!reopenReason.trim()) {
      setError('Reason required to reopen day');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/daily-close/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reopenReason }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        fetchMetrics();
        setReopenReason('');
        setError(null);
      } else {
        setError(data.message || 'Failed to reopen day');
      }
    } catch (err) {
      setError('Network error during reopen');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Lock className="text-slate-500" size={20} />
            <h3 className="text-lg font-bold text-slate-800">Daily Closing</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm font-medium">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading today's metrics...</div>
          ) : metrics ? (
            <>
              {metrics.isLocked ? (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start gap-3">
                  <Lock className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-bold text-emerald-800">Day is Closed</h4>
                    <p className="text-sm text-emerald-600 mt-1">Today's transactions are locked and financial metrics have been finalized.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Orders</p>
                    <p className="text-xl font-bold text-slate-800">{metrics.ordersCount}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Production</p>
                    <p className="text-xl font-bold text-slate-800">{metrics.productionBatchesCount} batches</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-xl">
                    <p className="text-xs font-semibold text-emerald-600 uppercase">Cash Collected</p>
                    <p className="text-xl font-bold text-emerald-700">Rs. {Number(metrics.cashCollected || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-rose-50 p-4 rounded-xl">
                    <p className="text-xs font-semibold text-rose-600 uppercase">Expenses</p>
                    <p className="text-xl font-bold text-rose-700">Rs. {Number(metrics.expenses || 0).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {!metrics.isLocked && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="font-semibold text-slate-700">Closing Checklist</h4>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={checks.stock} onChange={e => setChecks({...checks, stock: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-sky-500 focus:ring-sky-500" />
                    <span className="text-sm text-slate-600 group-hover:text-slate-800">Stock counts verified in warehouse</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={checks.production} onChange={e => setChecks({...checks, production: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-sky-500 focus:ring-sky-500" />
                    <span className="text-sm text-slate-600 group-hover:text-slate-800">Production counts cross-checked</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={checks.route} onChange={e => setChecks({...checks, route: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-sky-500 focus:ring-sky-500" />
                    <span className="text-sm text-slate-600 group-hover:text-slate-800">WhatsApp route reports matched</span>
                  </label>
                </div>
              )}

              {metrics.isLocked && user?.role === 'OWNER' && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h4 className="font-semibold text-slate-700 flex items-center gap-2"><Unlock size={16}/> Owner Override: Reopen Day</h4>
                  <input
                    type="text"
                    placeholder="Reason for reopening..."
                    value={reopenReason}
                    onChange={e => setReopenReason(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                  />
                  <button
                    onClick={handleReopenDay}
                    disabled={isSubmitting || !reopenReason.trim()}
                    className="w-full py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processing...' : 'Reopen Day'}
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 font-medium rounded-xl transition-colors">
            {metrics?.isLocked ? 'Close' : 'Cancel'}
          </button>
          {(!metrics || !metrics.isLocked) && (
            <button
              onClick={handleCloseDay}
              disabled={!allChecked || isSubmitting}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Lock size={18} />
              {isSubmitting ? 'Closing...' : 'Close Day'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
