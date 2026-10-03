import { useState, useEffect } from 'react';
import { ClipboardCheck, DollarSign, Droplets, Package, Shield, Save, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { fetchCounterAuditLedger, submitCounterAuditLedger } from '../../services/dailyCloseService';

export default function CounterAuditLedgerCard({ date, tenant, isClosed, onLedgerSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ledger, setLedger] = useState(null);

  const [form, setForm] = useState({
    physicalCashInHand: '',
    recordedWaterLitres: '',
    countedBottles: '',
    countedCaps: '',
    cameraVerificationNotes: ''
  });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchCounterAuditLedger(date, tenant)
      .then(res => {
        if (!mounted) return;
        if (res.success && res.data) {
          setLedger(res.data);
          setForm({
            physicalCashInHand: res.data.physicalCashInHand !== null ? res.data.physicalCashInHand : '',
            recordedWaterLitres: res.data.recordedWaterLitres !== null ? res.data.recordedWaterLitres : '',
            countedBottles: res.data.countedBottles !== null ? res.data.countedBottles : '',
            countedCaps: res.data.countedCaps !== null ? res.data.countedCaps : '',
            cameraVerificationNotes: res.data.cameraVerificationNotes || ''
          });
        } else {
          setLedger(null);
          setForm({
            physicalCashInHand: '',
            recordedWaterLitres: '',
            countedBottles: '',
            countedCaps: '',
            cameraVerificationNotes: ''
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [date, tenant]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        date,
        physicalCashInHand: form.physicalCashInHand !== '' ? Number(form.physicalCashInHand) : 0,
        recordedWaterLitres: form.recordedWaterLitres !== '' ? Number(form.recordedWaterLitres) : 0,
        countedBottles: form.countedBottles !== '' ? Number(form.countedBottles) : 0,
        countedCaps: form.countedCaps !== '' ? Number(form.countedCaps) : 0,
        cameraVerificationNotes: form.cameraVerificationNotes.trim() || undefined,
        isVerified: true
      };

      const res = await submitCounterAuditLedger(payload, tenant);
      if (res.success) {
        toast.success('Counter Audit Ledger submitted and verified!');
        setLedger(res.data);
        if (onLedgerSaved) onLedgerSaved(res.data);
      } else {
        toast.error(res.message || 'Failed to save audit ledger');
      }
    } catch {
      toast.error('Network error saving counter audit ledger');
    } finally {
      setSaving(false);
    }
  };

  const isSaved = !!ledger?.id;

  return (
    <div className={`card-surface p-5 border-2 ${isSaved ? 'border-emerald-200 bg-emerald-50/20' : 'border-amber-200 bg-amber-50/20'} space-y-4 rounded-xl shadow-xs transition-all`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border ${isSaved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            <ClipboardCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Counter Audit Ledger (Pre-Close Verification)
              </h3>
              {isSaved ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle size={12} /> Verified & Saved
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                  Required Before Final Lock
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Record physical counter cash, water meter readings, physical bottle & cap counts, and CCTV audit notes.
            </p>
          </div>
        </div>

        {ledger?.recordedBy && (
          <span className="text-[11px] text-slate-500 font-medium self-start sm:self-center">
            Last audited by: <strong className="text-slate-800 font-semibold">{ledger.recordedBy.name}</strong> ({ledger.recordedBy.role})
          </span>
        )}
      </div>

      {loading ? (
        <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
          <RefreshCw size={14} className="animate-spin" /> Loading audit ledger...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Physical Cash in Hand */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <DollarSign size={13} className="text-emerald-600" /> Physical Cash (Rs.)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                disabled={isClosed || saving}
                placeholder="0"
                value={form.physicalCashInHand}
                onChange={e => setForm(prev => ({ ...prev, physicalCashInHand: e.target.value }))}
                className="input-base text-xs font-mono font-bold w-full"
                required
              />
            </div>

            {/* 2. Recorded Water Litres */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Droplets size={13} className="text-blue-600" /> Water Meter Reading (L)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                disabled={isClosed || saving}
                placeholder="0"
                value={form.recordedWaterLitres}
                onChange={e => setForm(prev => ({ ...prev, recordedWaterLitres: e.target.value }))}
                className="input-base text-xs font-mono font-bold w-full"
                required
              />
            </div>

            {/* 3. Counted Bottles */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Package size={13} className="text-indigo-600" /> Physical Bottle Count
              </label>
              <input
                type="number"
                min="0"
                disabled={isClosed || saving}
                placeholder="0"
                value={form.countedBottles}
                onChange={e => setForm(prev => ({ ...prev, countedBottles: e.target.value }))}
                className="input-base text-xs font-mono font-bold w-full"
                required
              />
            </div>

            {/* 4. Counted Caps */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Shield size={13} className="text-amber-600" /> Physical Cap Count
              </label>
              <input
                type="number"
                min="0"
                disabled={isClosed || saving}
                placeholder="0"
                value={form.countedCaps}
                onChange={e => setForm(prev => ({ ...prev, countedCaps: e.target.value }))}
                className="input-base text-xs font-mono font-bold w-full"
                required
              />
            </div>
          </div>

          {/* Camera Verification Note */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">
              Camera / CCTV Verification Notes & Discrepancies
            </label>
            <textarea
              rows={2}
              disabled={isClosed || saving}
              placeholder="e.g. CCTV reviewed: Cashier drawer handover clean, no unrecorded walk-ins observed, seal numbers intact..."
              value={form.cameraVerificationNotes}
              onChange={e => setForm(prev => ({ ...prev, cameraVerificationNotes: e.target.value }))}
              className="input-base text-xs py-2 w-full resize-none"
            />
          </div>

          {!isClosed && (
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={saving}
                className={`py-2 px-5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs ${
                  isSaved
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{saving ? 'Saving Ledger...' : isSaved ? 'Update Counter Audit Ledger' : 'Submit & Verify Audit Ledger'}</span>
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
