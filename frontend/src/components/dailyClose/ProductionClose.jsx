import { useState } from 'react';
import { Factory, AlertTriangle } from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useDailyClose } from '../../hooks/useDailyClose';
import { confirmPM } from '../../services/dailyCloseService';
import DailyCloseHeader from './DailyCloseHeader';
import ClosedDayBanner from './ClosedDayBanner';
import VerificationChecklist from './VerificationChecklist';

const PM_CHECKLIST = [
  { key: 'batchesLogged', label: 'All production batches recorded for today.' },
  { key: 'materialsDeducted', label: 'Raw materials properly deducted from inventory.' },
];

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
    } catch { toast.error('Error confirming production'); }
    finally { setSubmitting(false); }
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
  const hasBlockers = (status?.pendingBatchesCount > 0) || (status?.negativeStockCount > 0);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <DailyCloseHeader
        label="PRODUCTION"
        labelColor="blue"
        icon={Factory}
        title="Production Daily Close"
        description="Verify production batches, raw material deductions, and waste logs."
        date={date}
        onDateChange={setDate}
      />

      {isClosed ? (
        <ClosedDayBanner date={date} closedBy={status?.closedBy} closedAt={status?.closedAt} />
      ) : (
        <>
          {/* Production Stats */}
          <div className="card-surface p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-800">Production Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase">19L Bottles</p>
                <p className="text-lg sm:text-xl font-black font-mono text-slate-800">{p.total19L || 0}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase">1.5L Packs</p>
                <p className="text-lg sm:text-xl font-black font-mono text-slate-800">{p.packs15L || 0}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase">0.5L Packs</p>
                <p className="text-lg sm:text-xl font-black font-mono text-slate-800">{p.packs05L || 0}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase">Waste / Breakage</p>
                <p className="text-lg sm:text-xl font-black font-mono text-rose-600">
                  {(p.waste19L || 0) + (p.broken15L || 0) + (p.broken05L || 0)}
                </p>
              </div>
            </div>

            {/* Material Consumption */}
            {materials.length > 0 && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Raw Material Consumption</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {materials.map(m => (
                    <div key={m.name} className="text-xs">
                      <span className="text-slate-600">{m.name}:</span>{' '}
                      <strong className="text-slate-900 font-mono">{m.quantity} {m.unit}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Warnings */}
            {hasBlockers && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
                  <AlertTriangle size={16} /> System Warnings
                </div>
                {status.pendingBatchesCount > 0 && (
                  <p className="text-xs text-amber-700">{status.pendingBatchesCount} batch(es) still PENDING — complete before confirming.</p>
                )}
                {status.negativeStockCount > 0 && (
                  <p className="text-xs text-amber-700">{status.negativeStockCount} item(s) have negative stock.</p>
                )}
              </div>
            )}
          </div>

          {/* PM Checklist */}
          <VerificationChecklist
            key={date}
            title="Production Verification"
            subtitle="Verified by Production Manager"
            items={PM_CHECKLIST}
            onConfirm={handleConfirm}
            confirmLabel="Confirm Production Close"
            confirmed={pmConfirmed}
            confirmedBy={status?.pmConfirmedBy?.name}
            submitting={submitting}
            disabled={hasBlockers}
          />
        </>
      )}
    </div>
  );
}
