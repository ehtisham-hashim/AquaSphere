import { useState, useEffect, useMemo } from 'react';
import { X, DollarSign, Upload, Loader2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';
import { useTenant } from '../../context/TenantContext';
import { clearCache } from '../../utils/apiCache';

export default function VendorPaymentModal({
  isOpen,
  vendor,
  selectedVendor, // backward-compatibility
  onClose,
  onSuccess
}) {
  const { tenant } = useTenant();
  const activeVendor = vendor || selectedVendor;

  const [todayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [vendorDetails, setVendorDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState(todayDate);
  const [referenceNo, setReferenceNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [proofUrl, setProofUrl] = useState('');

  // Fetch full vendor details with open purchases whenever modal opens for a vendor
  useEffect(() => {
    if (!isOpen || !activeVendor?.id) {
      setVendorDetails(null);
      setAmount('');
      setProofUrl('');
      setReferenceNo('');
      setRemarks('');
      setPaymentMethod('CASH');
      return;
    }

    let isMounted = true;
    const fetchVendorData = async () => {
      try {
        setLoadingDetails(true);
        const res = await fetch(`${API_URL}/vendors/${activeVendor.id}`, {
          headers: { 'x-tenant': tenant },
          credentials: 'include'
        });
        const json = await res.json();
        if (json.success && isMounted) {
          setVendorDetails(json.data);
          const payable = Number(json.data.payableBalance ?? activeVendor.payableBalance ?? 0);
          setAmount(payable > 0 ? String(payable) : '');
        }
      } catch (err) {
        console.error('Error loading vendor profile for payment modal:', err);
        if (isMounted) {
          const fallbackPayable = Number(activeVendor.payableBalance ?? 0);
          setAmount(fallbackPayable > 0 ? String(fallbackPayable) : '');
        }
      } finally {
        if (isMounted) setLoadingDetails(false);
      }
    };

    fetchVendorData();
    return () => { isMounted = false; };
  }, [isOpen, activeVendor?.id, activeVendor?.payableBalance, tenant]);

  const currentPayableBalance = Number(vendorDetails?.payableBalance ?? activeVendor?.payableBalance ?? 0);

  // Derive chronological open purchases (CREDIT and PARTIAL, not CANCELLED)
  const openPurchases = useMemo(() => {
    const list = vendorDetails?.purchases || [];
    return list
      .filter(p => p.status !== 'CANCELLED' && p.paymentStatus !== 'PAID')
      .map(p => {
        const grandTotal = Number(p.grandTotal || 0);
        const alreadyPaid = (p.ledgerEntries || [])
          .filter(e => !e.type || e.type === 'PAYMENT')
          .reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const due = Math.max(0, grandTotal - alreadyPaid);
        return {
          id: p.id,
          invoiceNo: p.invoiceNo || p.id.slice(0, 8),
          purchaseDate: p.purchaseDate || p.createdAt,
          grandTotal,
          alreadyPaid,
          due
        };
      })
      .sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
  }, [vendorDetails]);

  // FIFO Live Simulation based on entered amount
  const enteredAmount = parseFloat(amount || 0);
  const totalOpenDue = openPurchases.reduce((s, p) => s + p.due, 0);
  const advanceAmount = Math.max(0, (isNaN(enteredAmount) ? 0 : enteredAmount) - totalOpenDue);

  const simulatedAllocation = useMemo(() => {
    let pool = isNaN(enteredAmount) ? 0 : enteredAmount;
    const result = [];
    for (let i = 0; i < openPurchases.length; i++) {
      const p = openPurchases[i];
      if (pool <= 0) {
        result.push({ ...p, allocated: 0, status: 'UNPAID' });
      } else if (pool >= p.due - 0.009) {
        const alloc = p.due;
        pool -= p.due;
        result.push({ ...p, allocated: alloc, status: 'PAID' });
      } else {
        const alloc = pool;
        pool = 0;
        result.push({ ...p, allocated: alloc, status: 'PARTIAL' });
      }
    }
    return result;
  }, [openPurchases, enteredAmount]);

  // Hook safety: All hooks must be defined before early return
  if (!isOpen || !activeVendor) return null;

  const requiresProof = ['BANK_TRANSFER', 'CHEQUE', 'ONLINE_TRANSFER'].includes(paymentMethod);
  const isSubmitDisabled =
    submitting ||
    uploadingProof ||
    loadingDetails ||
    isNaN(enteredAmount) ||
    enteredAmount <= 0 ||
    (currentPayableBalance > 0 && enteredAmount > currentPayableBalance + 0.01) ||
    (requiresProof && !proofUrl);

  const handleUploadPaymentProof = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, JPG, PNG, and WEBP image files are allowed. PDF not supported.');
      e.target.value = '';
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size exceeds 5MB limit');
      e.target.value = '';
      return;
    }

    setUploadingProof(true);
    try {
      const fd = new FormData();
      fd.append('image', file);

      const res = await fetch(`${API_URL}/vendors/upload-payment-proof`, {
        method: 'POST',
        headers: { 'x-tenant': tenant },
        body: fd,
        credentials: 'include'
      });
      let json = {};
      try {
        json = await res.json();
      } catch {
        // Fallback
      }
      const uploadedUrl = json.data?.proofUrl || json.proofUrl;
      if (res.ok && json.success && uploadedUrl) {
        setProofUrl(uploadedUrl);
        toast.success('Payment proof uploaded successfully!');
      } else {
        toast.error(json.message || 'Failed to upload proof');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Error uploading payment proof');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isNaN(enteredAmount) || enteredAmount <= 0) {
      toast.error('Please enter a payment amount greater than zero');
      return;
    }

    if (currentPayableBalance > 0 && enteredAmount > currentPayableBalance + 0.01) {
      toast.error(`Payment amount cannot exceed outstanding balance of Rs. ${currentPayableBalance.toLocaleString()}`);
      return;
    }

    if (requiresProof && !proofUrl) {
      toast.error(`Payment proof slip is required for ${paymentMethod.replace('_', ' ')}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/vendors/${activeVendor.id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        credentials: 'include',
        body: JSON.stringify({
          amount: enteredAmount,
          paymentMethod,
          paymentDate,
          referenceNo: referenceNo.trim() || undefined,
          proofUrl: proofUrl || undefined,
          remarks: remarks.trim() || undefined
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to record vendor payment');
      }

      toast.success(
        json.message ||
        `Payment of Rs. ${enteredAmount.toLocaleString()} recorded for ${activeVendor.name}!`
      );

      clearCache('vendors');
      clearCache('purchases');
      clearCache('expenses');
      clearCache('daily-close');

      if (onSuccess) onSuccess(json.data);
      onClose();
    } catch (err) {
      console.error('Vendor payment submission error:', err);
      toast.error(err.message || 'Error recording vendor payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
              <DollarSign size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Record Vendor Payment</h3>
              <p className="text-xs text-slate-500 font-medium">
                Paying: <span className="font-semibold text-slate-700">{activeVendor.name}</span>
                {activeVendor.phone && <span className="text-slate-400 ml-1.5">• {activeVendor.phone}</span>}
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Outstanding Balance Banner */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex justify-between items-center">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block tracking-wider">
                Outstanding Payable Balance
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {openPurchases.length} open credit purchase order(s)
              </span>
            </div>
            <span className="text-lg font-black font-mono text-[var(--brand)]">
              Rs. {currentPayableBalance.toLocaleString()}
            </span>
          </div>

          {/* Amount Input with "Pay Full" shortcut */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="font-bold uppercase text-slate-700 text-[11px] tracking-wider">
                Payment Amount (Rs) <span className="text-rose-500">*</span>
              </label>
              {currentPayableBalance > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(currentPayableBalance))}
                  className="text-[11px] font-bold text-[var(--brand)] hover:opacity-80 bg-[var(--brand-light)] px-2.5 py-1 rounded-md transition"
                >
                  Pay Full (Rs {currentPayableBalance.toLocaleString()})
                </button>
              )}
            </div>
            <input
              type="number"
              step="any"
              min="0.01"
              max={currentPayableBalance > 0 ? currentPayableBalance : undefined}
              className="input-base font-mono font-bold text-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase text-slate-700 mb-1.5 text-[11px] tracking-wider">
                Payment Channel <span className="text-rose-500">*</span>
              </label>
              <select
                className="select-base"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="CASH">Cash (Physical Handover)</option>
                <option value="BANK_TRANSFER">Bank Transfer (Meezan / Allied)</option>
                <option value="EASYPAISA">EasyPaisa</option>
                <option value="JAZZCASH">JazzCash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="ONLINE_TRANSFER">Online Transfer</option>
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase text-slate-700 mb-1.5 text-[11px] tracking-wider">
                Payment Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                className="input-base"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Reference # */}
          <div>
            <label className="block font-bold uppercase text-slate-700 mb-1.5 text-[11px] tracking-wider">
              Reference / Cheque #
            </label>
            <input
              className="input-base"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. Bank Txn #9412 or Cheque #1092"
            />
          </div>

          {/* Payment Proof Slip (conditional on payment channel) */}
          {requiresProof && (
            <div className="space-y-2">
              <label className="block font-bold uppercase text-slate-700 mb-1 text-[11px] tracking-wider">
                Payment Proof (Receipt / Slip) <span className="text-rose-500">*</span>
              </label>

              {!proofUrl ? (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center hover:border-emerald-400 transition-colors bg-slate-50">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="hidden"
                      onChange={handleUploadPaymentProof}
                    />
                    <div className="flex flex-col items-center gap-2">
                      {uploadingProof ? (
                        <>
                          <Loader2 size={28} className="animate-spin text-emerald-600" />
                          <span className="text-xs font-semibold text-emerald-600">Uploading proof slip...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={28} className="text-slate-400" />
                          <span className="text-xs font-bold text-slate-700">Click to upload transfer receipt/slip</span>
                          <span className="text-[11px] text-slate-400">JPEG, JPG, PNG, WEBP up to 5MB</span>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              ) : (
                <div className="relative border border-emerald-200 rounded-xl p-3 bg-emerald-50/40">
                  <div className="flex items-center gap-3">
                    <img
                      src={proofUrl}
                      alt="Payment proof"
                      className="w-14 h-14 object-cover rounded-lg border border-emerald-200"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 size={14} className="text-emerald-600" /> Proof slip attached
                      </p>
                      <a
                        href={proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-emerald-600 hover:underline"
                      >
                        View full image
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProofUrl('')}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remove proof"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FIFO Live Simulation Preview */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase text-slate-700 text-[11px] tracking-wider flex items-center gap-1.5">
                <ArrowRight size={13} className="text-emerald-600" />
                Automatic FIFO Debt Allocation Preview
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                Oldest credit purchases paid first
              </span>
            </div>

            {loadingDetails ? (
              <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-emerald-600" />
                <span>Loading open purchases...</span>
              </div>
            ) : openPurchases.length === 0 ? (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500">
                <p className="font-semibold text-slate-700">No open credit purchases found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Payment will be recorded as advance credit on the vendor&apos;s ledger.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-[11px] whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-2.5">Purchase #</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5 text-right">Total</th>
                      <th className="p-2.5 text-right">Due</th>
                      <th className="p-2.5 text-right">Allocated</th>
                      <th className="p-2.5 text-center">New Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {simulatedAllocation.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="p-2.5 font-bold font-mono text-slate-800">{item.invoiceNo}</td>
                        <td className="p-2.5 text-slate-500">
                          {new Date(item.purchaseDate).toLocaleDateString()}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-600">
                          Rs. {item.grandTotal.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right font-mono text-rose-600 font-semibold">
                          Rs. {item.due.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-600">
                          Rs. {item.allocated.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-center">
                          {item.status === 'PAID' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              PAID
                            </span>
                          ) : item.status === 'PARTIAL' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              PARTIAL
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                              UNPAID
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {advanceAmount > 0.009 && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-blue-800 text-[11px]">
                <AlertCircle size={14} className="text-blue-600 shrink-0" />
                <span>
                  <strong>Rs. {advanceAmount.toLocaleString()}</strong> exceeds current unpaid purchases and will be credited as <strong>Advance Payment</strong> on this vendor&apos;s ledger.
                </span>
              </div>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block font-bold uppercase text-slate-700 mb-1.5 text-[11px] tracking-wider">
              Remarks
            </label>
            <input
              className="input-base"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Cleared raw material supplies for October..."
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="btn-primary flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Recording Payment...
                </>
              ) : uploadingProof ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Uploading Slip...
                </>
              ) : (
                `Settle Rs. ${(isNaN(enteredAmount) ? 0 : enteredAmount).toLocaleString()}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
