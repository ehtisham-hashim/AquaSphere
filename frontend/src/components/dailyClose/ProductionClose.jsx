import { useState } from 'react';
import { Factory, CheckCircle2, RefreshCw, Box } from 'lucide-react';
import { toast } from 'sonner';
import { useDailyClose } from '../../hooks/useDailyClose';
import { confirmPM } from '../../services/dailyCloseService';
import DailyCloseHeader from './DailyCloseHeader';
import ClosedDayBanner from './ClosedDayBanner';

export default function ProductionClose() {
  const { date, setDate, status, loading, refreshStatus, isClosed, pmConfirmed, tenant } = useDailyClose();
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const json = await confirmPM(date, tenant);
      if (json.success) {
        toast.success('Production confirmed successfully');
        refreshStatus(false);
      } else {
        toast.error(json.message || 'Failed to confirm');
      }
    } catch {
      toast.error('Error confirming production');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const p = status?.productionTotals || {};
  const materials = status?.materialConsumption || [];

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <DailyCloseHeader
        label="PRODUCTION VERIFICATION"
        labelColor="blue"
        icon={Factory}
        title="Production Daily Close"
        description="Verify today's bottled output, packaging numbers, and raw material usage."
        date={date}
        onDateChange={setDate}
      />

      {isClosed ? (
        <ClosedDayBanner date={date} closedBy={status?.closedBy} closedAt={status?.closedAt} />
      ) : (
        <div className="space-y-4">
          {/* Production Output Stats */}
          <div className="card-surface p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Today's Production Output</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase">19L Bottles</p>
                <p className="text-xl font-extrabold font-mono text-slate-900">{p.total19L || 0}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase">1.5L Packs</p>
                <p className="text-xl font-extrabold font-mono text-slate-900">{p.packs15L || 0}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase">0.5L Packs</p>
                <p className="text-xl font-extrabold font-mono text-slate-900">{p.packs05L || 0}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase">Bottle Waste</p>
                <p className="text-xl font-extrabold font-mono text-rose-600">{p.waste19L || 0}</p>
              </div>
            </div>
          </div>

          {/* Raw Material Usage */}
          {materials.length > 0 && (
            <div className="card-surface p-5 space-y-3">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Raw Material Consumption</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {materials.map((m, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="text-slate-500 font-medium block truncate">{m.name}</span>
                    <strong className="text-slate-800 font-mono text-sm">{m.quantity} {m.unit}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Single-Click Verify Action */}
          <div className="card-surface p-5 border-2 border-blue-100 bg-blue-50/20">
            {pmConfirmed ? (
              <div className="flex items-center gap-3 text-emerald-800">
                <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-extrabold">Production Verified for Today ✓</h4>
                  <p className="text-xs text-emerald-700 font-medium">
                    Confirmed by {status?.pmConfirmedBy?.name || 'Production Manager'}
                    {status?.pmConfirmedAt && ` at ${new Date(status.pmConfirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="space-y-0.5 text-center sm:text-left">
                  <h4 className="text-sm font-extrabold text-slate-900">Verify Production Report</h4>
                  <p className="text-xs text-slate-500">Confirm today's bottled production totals are accurate for admin double-verification.</p>
                </div>
                <button
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="btn-primary py-2.5 px-6 text-xs font-bold flex items-center gap-2 shrink-0"
                >
                  {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Box size={14} />}
                  <span>{submitting ? 'Confirming...' : 'Verify Production Report'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
