import { useState, useEffect } from 'react';
import { DollarSign, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useDailyClose } from '../../hooks/useDailyClose';
import { fetchDailySummary, finalizeDay } from '../../services/dailyCloseService';
import DailyCloseHeader from './DailyCloseHeader';
import ClosedDayBanner from './ClosedDayBanner';
import StatusCard from './StatusCard';
import DrawerReconciliationCard from './DrawerReconciliationCard';
import CounterAuditLedgerCard from './CounterAuditLedgerCard';

export default function AccountantClose() {
  const { date, setDate, status, loading, refreshStatus, isClosed, pmConfirmed, mmConfirmed, tmConfirmed, tenant } = useDailyClose();
  const [cash, setCash] = useState(null);
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setActualCash('');
    setNotes('');
    fetchDailySummary(date, tenant).then(json => {
      if (json.success) {
        const d = json.data;
        setCash({
          orderCash: d.ordersCashOnly ?? d.totalDeliveryAmount ?? 0,
          counterSales: d.spotSalesCashOnly ?? d.totalSpotSales ?? 0,
          totalExpenses: d.totalExpenses || 0,
          vendorCash: d.totalVendorCash || 0,
          netCash: d.expectedDrawerCash ?? ((d.totalDeliveryAmount || 0) + (d.totalSpotSales || 0) - (d.totalExpenses || 0))
        });
      }
    }).catch(() => setCash({ orderCash: 0, counterSales: 0, totalExpenses: 0, vendorCash: 0, netCash: 0 }));
  }, [date, tenant]);

  const handleFinalize = async () => {
    setSubmitting(true);
    try {
      const payload = {
        actualCash: actualCash !== '' ? Number(actualCash) : undefined,
        notes: notes.trim() || undefined
      };
      const json = await finalizeDay(date, tenant, payload);
      if (json.success) {
        toast.success('Day finalized and locked successfully.');
        refreshStatus(false);
      } else {
        toast.error(json.message || 'Failed to lock day');
      }
    } catch {
      toast.error('Error locking day');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <DailyCloseHeader
        label="ACCOUNTING & FINANCE"
        labelColor="emerald"
        icon={DollarSign}
        title="Accountant Daily Close"
        description="Review cash collections, expenses, physical count, and lock daily financial records."
        date={date}
        onDateChange={setDate}
      />

      {isClosed ? (
        <ClosedDayBanner date={date} closedBy={status?.closedBy} closedAt={status?.closedAt} />
      ) : (
        <>
          {/* Cash Summary */}
          {cash && (
            <div className="card-surface p-5 space-y-3">
              <h3 className="text-base font-bold text-slate-800">Financial Summary</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Order Cash</span>
                  <span className="text-sm sm:text-base font-black font-mono text-slate-800">Rs. {cash.orderCash.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Counter Sales</span>
                  <span className="text-sm sm:text-base font-black font-mono text-brand-primary">Rs. {cash.counterSales.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Total Expenses</span>
                  <span className="text-sm sm:text-base font-black font-mono text-rose-600">Rs. {cash.totalExpenses.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Net Cash</span>
                  <span className={`text-sm sm:text-base font-black font-mono ${cash.netCash >= 0 ? 'text-brand-primary' : 'text-rose-600'}`}>
                    Rs. {cash.netCash.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Drawer Reconciliation */}
          <DrawerReconciliationCard
            expectedCash={cash?.netCash || 0}
            actualCash={actualCash}
            onActualCashChange={setActualCash}
            notes={notes}
            onNotesChange={setNotes}
            disabled={isClosed || submitting}
          />

          {/* Counter Audit Ledger Pre-Close Verification */}
          <CounterAuditLedgerCard
            date={date}
            tenant={tenant}
            isClosed={isClosed}
            onLedgerSaved={() => refreshStatus(false)}
          />

          {/* Finalize & Lock Action */}
          <div className="card-surface p-5 border-2 border-emerald-100 bg-emerald-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 text-emerald-950 font-black text-base">
                <ShieldCheck size={20} className="text-emerald-600" />
                <span>Accountant Verification & Lock</span>
              </div>
              <p className="text-xs text-emerald-800 font-medium">
                Finalizing locks the day's financial ledger, cash drawer count, and prevents subsequent mutations.
              </p>
            </div>
            <button
              onClick={handleFinalize}
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 shrink-0"
            >
              {submitting ? 'Finalizing...' : 'Finalize & Lock Day'}
            </button>
          </div>

          {/* Close Status */}
          <div className="card-surface p-5 space-y-2.5">
            <h3 className="text-base font-bold text-slate-800 mb-2">Day Close Status</h3>
            <StatusCard label="Production (PM)" confirmed={pmConfirmed} confirmedBy={status?.pmConfirmedBy?.name} />
            <StatusCard label="Marketing (MM)" confirmed={mmConfirmed} confirmedBy={status?.mmConfirmedBy?.name} />
            <StatusCard label="Transport (TM)" confirmed={tmConfirmed} confirmedBy={status?.tmConfirmedBy?.name} />
            <StatusCard label="Admin Finalization" confirmed={isClosed} confirmedBy={status?.closedBy?.name} />
          </div>
        </>
      )}
    </div>
  );
}
