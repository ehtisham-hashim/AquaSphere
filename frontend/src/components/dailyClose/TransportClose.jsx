import { useState } from 'react';
import { Truck, RefreshCw, Fuel, Wrench, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDailyClose } from '../../hooks/useDailyClose';
import { confirmTM } from '../../services/dailyCloseService';
import DailyCloseHeader from './DailyCloseHeader';
import ClosedDayBanner from './ClosedDayBanner';

export default function TransportClose() {
  const { date, setDate, status, loading, refreshStatus, isClosed, tmConfirmed, tenant } = useDailyClose();
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const json = await confirmTM(date, tenant);
      if (json.success) {
        toast.success('Transport daily close confirmed successfully');
        refreshStatus(false);
      } else {
        toast.error(json.message || 'Failed to confirm transport close');
      }
    } catch {
      toast.error('Error confirming transport close');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
      </div>
    );
  }

  const transport = status?.transportTotals || {};
  const fuelTotal = transport.fuelTotal || 0;
  const repairsTotal = transport.repairsTotal || 0;
  const totalExpenses = transport.totalExpenses || 0;
  const totalVehicles = transport.totalVehicles || 0;
  const expensesList = transport.expensesList || [];

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <DailyCloseHeader
        label="TRANSPORT & FLEET VERIFICATION"
        labelColor="amber"
        icon={Truck}
        title="Transport Daily Close"
        description="Verify vehicle fleet operations, fuel expenses, and maintenance logs."
        date={date}
        onDateChange={setDate}
      />

      {isClosed ? (
        <ClosedDayBanner date={date} closedBy={status?.closedBy} closedAt={status?.closedAt} />
      ) : (
        <div className="space-y-4">
          {/* Fleet & Expense Summary Cards */}
          <div className="card-surface p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Fleet & Fuel Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase">Active Vehicles</p>
                <p className="text-xl font-extrabold font-mono text-slate-900">{totalVehicles}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase flex items-center gap-1">
                  <Fuel size={12} className="text-amber-600" /> Fuel Total
                </p>
                <p className="text-xl font-extrabold font-mono text-slate-900">Rs. {fuelTotal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase flex items-center gap-1">
                  <Wrench size={12} className="text-blue-600" /> Repairs Total
                </p>
                <p className="text-xl font-extrabold font-mono text-slate-900">Rs. {repairsTotal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase">Total Expenses</p>
                <p className="text-xl font-extrabold font-mono text-rose-600">Rs. {totalExpenses.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Recent Daily Transport Expenses */}
          {expensesList.length > 0 && (
            <div className="card-surface p-5 space-y-3">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Transport Expenses Log</h3>
              <div className="divide-y divide-slate-100 text-xs">
                {expensesList.map((exp, idx) => (
                  <div key={exp.id || idx} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">{exp.vehicle?.name || exp.vehicle?.plateNumber || 'Fleet Vehicle'}</span>
                      <span className="text-[11px] text-slate-500 block">{exp.category} · {exp.description || 'Routine'}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">Rs. {Number(exp.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Single-Click Verify Action */}
          <div className="card-surface p-5 border-2 border-amber-100 bg-amber-50/20">
            {tmConfirmed ? (
              <div className="flex items-center gap-3 text-emerald-800">
                <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-extrabold">Transport & Fleet Verified for Today ✓</h4>
                  <p className="text-xs text-emerald-700 font-medium">
                    Confirmed by {status?.tmConfirmedBy?.name || 'Transport Manager'}
                    {status?.tmConfirmedAt && ` at ${new Date(status.tmConfirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="space-y-0.5 text-center sm:text-left">
                  <h4 className="text-sm font-extrabold text-slate-900">Verify Transport & Fuel</h4>
                  <p className="text-xs text-slate-500">Confirm today's vehicle fuel receipts and maintenance logs for admin double-verification.</p>
                </div>
                <button
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="btn-primary py-2.5 px-6 text-xs font-bold flex items-center gap-2 shrink-0"
                >
                  {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Truck size={14} />}
                  <span>{submitting ? 'Confirming...' : 'Verify Transport Report'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
