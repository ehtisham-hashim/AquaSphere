import { useState } from 'react';
import { Truck, RefreshCw, Fuel, Wrench, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { useDailyClose } from '../../hooks/useDailyClose';
import { confirmTM } from '../../services/dailyCloseService';
import DailyCloseHeader from './DailyCloseHeader';
import ClosedDayBanner from './ClosedDayBanner';
import VerificationChecklist from './VerificationChecklist';

const TM_CHECKLIST = [
  { key: 'fuelLogged', label: 'All vehicle fuel expenses and receipts logged for today.' },
  { key: 'vehiclesInspected', label: 'All delivery vehicles returned, parked, and inspected.' }
];

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
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
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
    <div className="space-y-4 max-w-4xl mx-auto">
      <DailyCloseHeader
        label="TRANSPORT"
        labelColor="emerald"
        icon={Truck}
        title="Transport Daily Close"
        description="Verify vehicle fuel logs, repair records, and daily fleet operations."
        date={date}
        onDateChange={setDate}
      />

      {isClosed ? (
        <ClosedDayBanner date={date} closedBy={status?.closedBy} closedAt={status?.closedAt} />
      ) : (
        <>
          {/* Transport Summary */}
          <div className="card-surface p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-800">Transport Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase flex items-center gap-1">
                  <Fuel size={12} className="text-amber-600" /> Today's Fuel
                </span>
                <strong className="text-slate-800 font-mono font-bold text-sm">Rs. {fuelTotal.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase flex items-center gap-1">
                  <Wrench size={12} className="text-blue-600" /> Today's Repairs
                </span>
                <strong className="text-slate-800 font-mono font-bold text-sm">Rs. {repairsTotal.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase flex items-center gap-1">
                  <Receipt size={12} className="text-rose-600" /> Total Vehicle Exp.
                </span>
                <strong className="text-rose-600 font-mono font-bold text-sm">Rs. {totalExpenses.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase flex items-center gap-1">
                  <Truck size={12} className="text-emerald-600" /> Active Fleet
                </span>
                <strong className="text-emerald-700 font-mono font-bold text-sm">{totalVehicles} Vehicles</strong>
              </div>
            </div>

            {/* Today's Vehicle Expenses List */}
            {expensesList.length > 0 ? (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Logged Vehicle Expenses Today</h4>
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {expensesList.map((ex) => (
                    <div key={ex.id} className="py-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">
                          {ex.vehicle ? `${ex.vehicle.name} (${ex.vehicle.plateNumber})` : 'General Transport'}
                        </span>
                        <span className="badge-neutral text-[10px]">{ex.category}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-700">Rs. {Math.round(Number(ex.amount)).toLocaleString()}</span>
                        {ex.receiptUrl && (
                          <a href={ex.receiptUrl} target="_blank" rel="noreferrer" className="text-brand-primary underline text-[11px]">Receipt</a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic pt-1">No vehicle expenses logged yet for this date.</p>
            )}
          </div>

          {/* Verification Checklist + Confirmation */}
          <VerificationChecklist
            key={date}
            title="Transport Fleet Verification"
            subtitle="Verified by Transport Manager"
            items={TM_CHECKLIST}
            isConfirmed={tmConfirmed}
            confirmedBy={status?.tmConfirmedBy}
            confirmRole="Transport Manager"
            onConfirm={handleConfirm}
            submitting={submitting}
          />
        </>
      )}
    </div>
  );
}
