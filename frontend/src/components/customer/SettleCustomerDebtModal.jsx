import { useState, useEffect, useMemo } from 'react';
import { X, DollarSign, Shield, CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';
import { useTenant } from '../../context/TenantContext';

export default function SettleCustomerDebtModal({ customer, onClose, onSuccess }) {
  const { tenant } = useTenant();
  const [details, setDetails] = useState(customer);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [settleFromSecurity, setSettleFromSecurity] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');

  // Fetch full customer details including unpaid orders and spot sales
  useEffect(() => {
    let isMounted = true;
    const fetchFullCustomer = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${API_URL}/customers/${customer.id}`, {
          headers: { 'x-tenant': tenant },
          credentials: 'include'
        });
        const json = await res.json();
        if (json.success && isMounted) {
          setDetails(json.data);
          const debt = Number(json.data.currentBalance || 0);
          setAmount(debt > 0 ? debt.toString() : '0');
        }
      } catch (err) {
        console.error('Error fetching customer details for debt settlement:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchFullCustomer();
    return () => { isMounted = false; };
  }, [customer.id, tenant]);

  const currentDebt = Number(details?.currentBalance || 0);
  const deposit = Number(details?.deposit || 0);

  // Calculate deposit portion if enabled
  const depositDrawdown = settleFromSecurity ? Math.min(deposit, currentDebt) : 0;
  const remainingDebtAfterDeposit = Math.max(0, currentDebt - depositDrawdown);

  // Update cash amount when deposit toggle changes
  useEffect(() => {
    if (settleFromSecurity) {
      setAmount(remainingDebtAfterDeposit.toString());
    } else {
      setAmount(currentDebt.toString());
    }
  }, [settleFromSecurity, remainingDebtAfterDeposit, currentDebt]);

  const enteredCash = parseFloat(amount || 0);
  const totalSettlementPool = depositDrawdown + enteredCash;

  // Unpaid items for FIFO simulation
  const unpaidItems = useMemo(() => {
    const orders = (details?.orders || [])
      .filter(o => o.deliveryStatus === 'DELIVERED' && o.paymentStatus !== 'PAID')
      .map(o => {
        const sub = (o.items || []).reduce((s, it) => s + (Number(it.price || 0) * (it.quantity || 0)), 0);
        const total = sub + (o.withGst ? Math.round(sub * 0.18) : 0);
        const paid = (o.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
        const debt = Math.max(0, total - paid);
        return {
          id: o.id,
          type: 'ORDER',
          title: `Order #${o.id.slice(0, 6).toUpperCase()}`,
          date: o.createdAt,
          total,
          paid,
          debt
        };
      });

    const spotSales = (details?.spotSales || [])
      .filter(s => Number(s.debtAmount || 0) > 0)
      .map(s => {
        const debt = Number(s.debtAmount || 0);
        const paid = Number(s.amountPaid || s.cashCollected || 0);
        return {
          id: s.id,
          type: 'SPOT_SALE',
          title: `Counter Sale #${s.id.slice(0, 6).toUpperCase()}`,
          date: s.createdAt,
          total: debt + paid,
          paid,
          debt
        };
      });

    return [...orders, ...spotSales].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [details]);

  // FIFO Live Simulation
  const simulatedAllocation = useMemo(() => {
    let pool = totalSettlementPool;
    const result = [];
    for (let i = 0; i < unpaidItems.length; i++) {
      const item = unpaidItems[i];
      if (pool <= 0) {
        result.push({ ...item, allocated: 0, status: 'UNPAID' });
      } else if (pool >= item.debt) {
        pool -= item.debt;
        result.push({ ...item, allocated: item.debt, status: 'PAID' });
      } else {
        const allocated = pool;
        pool = 0;
        result.push({ ...item, allocated, status: 'PARTIAL' });
      }
    }
    return result;
  }, [unpaidItems, totalSettlementPool]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (enteredCash <= 0 && depositDrawdown <= 0) {
      toast.error('Please enter a payment amount or enable security deposit drawdown.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_URL}/customers/${customer.id}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        credentials: 'include',
        body: JSON.stringify({
          amount: enteredCash,
          paymentMethod,
          settleFromSecurity,
          remarks
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Debt settlement failed');
      }

      toast.success(`Successfully settled Rs. ${totalSettlementPool.toLocaleString()} for ${details.name}!`);
      if (onSuccess) onSuccess(json.data);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error processing debt settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <DollarSign size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Settle Outstanding Debt</h3>
              <p className="text-xs text-slate-500 font-medium">
                {details?.name} {details?.customerCode && <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-700 ml-1">{details.customerCode}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Debt & Deposit Summary Cards */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-left">
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Total Customer Debt</span>
              <span className="text-xl font-black font-mono text-rose-700 block mt-0.5">
                Rs. {currentDebt.toLocaleString()}
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-left">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block flex items-center gap-1">
                <Shield size={12} className="text-slate-500" /> Security Deposit
              </span>
              <span className="text-xl font-black font-mono text-slate-800 block mt-0.5">
                Rs. {deposit.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Security Deposit Drawdown Toggle */}
          {deposit > 0 && (
            <label className="flex items-start gap-3 p-3 bg-amber-50/70 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-50 transition">
              <input
                type="checkbox"
                checked={settleFromSecurity}
                onChange={(e) => setSettleFromSecurity(e.target.checked)}
                className="mt-1 h-4 w-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300"
              />
              <div className="text-xs">
                <span className="font-bold text-amber-900 block">Draw from Security Deposit</span>
                <span className="text-amber-700 block mt-0.5">
                  Apply up to Rs. {depositDrawdown.toLocaleString()} from customer deposit towards debt clearance.
                </span>
              </div>
            </label>
          )}

          {/* Payment Method & Amount Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Payment Channel</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-500"
              >
                <option value="CASH">Cash (Physical Handover)</option>
                <option value="BANK_TRANSFER">Bank Transfer (Meezan / Allied)</option>
                <option value="EASYPAISA">EasyPaisa</option>
                <option value="JAZZCASH">JazzCash</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Cash / Digital Amount (Rs)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full text-xs font-bold font-mono px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Remarks / Settlement Note</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Cleared full month-end balance via EasyPaisa"
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Live FIFO Simulation List */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <ArrowRight size={13} className="text-indigo-600" />
                FIFO Settlement Allocation Preview
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                Total Pool: <strong className="text-indigo-600 font-mono">Rs. {totalSettlementPool.toLocaleString()}</strong>
              </span>
            </div>

            {isLoading ? (
              <div className="p-4 text-center text-xs text-slate-400">Loading invoice schedule...</div>
            ) : simulatedAllocation.length === 0 ? (
              <div className="p-4 text-center text-xs text-emerald-600 font-semibold bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-center gap-1.5">
                <CheckCircle2 size={15} /> All orders and counter sales are fully settled!
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                {simulatedAllocation.map(item => (
                  <div key={item.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50/80">
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        {item.title}
                        <span className="text-[10px] text-slate-400 font-normal">
                          {new Date(item.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Remaining Debt: <span className="font-mono font-semibold">Rs. {item.debt.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {item.status === 'PAID' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          WILL PAY IN FULL (Rs. {item.allocated.toLocaleString()})
                        </span>
                      )}
                      {item.status === 'PARTIAL' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          PARTIALLY PAID (Rs. {item.allocated.toLocaleString()})
                        </span>
                      )}
                      {item.status === 'UNPAID' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          REMAINS UNPAID
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (enteredCash <= 0 && depositDrawdown <= 0)}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={15} />
              {isSubmitting ? 'Recording Settlement...' : `Confirm Payment (Rs. ${totalSettlementPool.toLocaleString()})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
