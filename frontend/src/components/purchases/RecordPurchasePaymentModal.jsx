import { useState } from 'react';
import { X, CreditCard, Loader2, Building2, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL as API } from '../../utils/api';
import { useTenant } from '../../context/TenantContext';

export default function RecordPurchasePaymentModal({ purchase, onClose, onSuccess }) {
  const { tenant } = useTenant();

  const [todayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [cashAmount, setCashAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState(todayDate);
  const [referenceNo, setReferenceNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!purchase) return null;

  const total = Number(purchase.grandTotal || 0);
  const alreadyPaid = (purchase.ledgerEntries || [])
    .filter(e => e.type === 'PAYMENT')
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || (purchase.paymentStatus === 'PAID' ? total : 0);
  const outstanding = Math.max(0, total - alreadyPaid);

  const handleProofUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

      const res = await fetch(`${API}/vendors/upload-payment-proof`, {
        method: 'POST',
        headers: { 'x-tenant': tenant },
        body: fd,
        credentials: 'include'
      });
      const json = await res.json();
      const uploaded = json.data?.proofUrl || json.proofUrl;
      if (res.ok && json.success && uploaded) {
        setProofUrl(uploaded);
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
    setError('');

    const amount = parseFloat(cashAmount);
    if (isNaN(amount) || amount <= 0) {
      return setError('Please enter a valid payment amount greater than zero.');
    }

    if (amount > outstanding + 0.01) {
      return setError(`Payment cannot exceed outstanding balance of Rs. ${outstanding.toLocaleString()}`);
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/purchases/${purchase.id}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        credentials: 'include',
        body: JSON.stringify({
          amount,
          paymentMethod,
          paymentDate,
          referenceNo: referenceNo.trim() || undefined,
          proofUrl: proofUrl || undefined,
          remarks: remarks.trim() || undefined
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to record payment');

      toast.success(`Payment of Rs. ${amount.toLocaleString()} recorded successfully!`);
      onSuccess && onSuccess(json.data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isNonCash = ['BANK_TRANSFER', 'CHEQUE', 'ONLINE_TRANSFER'].includes(paymentMethod);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
              <CreditCard size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Record Purchase Payment</h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Invoice #{purchase.invoiceNo || purchase.id.substring(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-1.5">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Vendor Banner */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
            <div className="flex items-center gap-2">
              <Building2 size={15} className="text-slate-400 shrink-0" />
              <div>
                <span className="font-bold text-slate-800">{purchase.vendor?.name || 'Vendor'}</span>
                {purchase.vendor?.phone && (
                  <span className="text-slate-400 font-mono text-[11px] block">{purchase.vendor.phone}</span>
                )}
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
              {purchase.paymentStatus || 'CREDIT'}
            </span>
          </div>

          {/* Quick Balance Stats */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono">
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Grand Total</span>
              <span className="font-bold text-slate-800">Rs. {total.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Paid</span>
              <span className="font-bold text-emerald-700">Rs. {alreadyPaid.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Outstanding</span>
              <span className="font-bold text-rose-600">Rs. {outstanding.toLocaleString()}</span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Payment Amount (PKR) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">Rs.</span>
              <input
                type="number"
                step="any"
                required
                autoFocus
                placeholder={outstanding.toString()}
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                className="input-base pl-10 font-mono font-bold text-slate-800 text-sm"
              />
            </div>
            {outstanding > 0 && (
              <button
                type="button"
                onClick={() => setCashAmount(outstanding.toString())}
                className="text-[11px] text-brand font-bold hover:underline mt-1 block"
              >
                Pay Full Outstanding (Rs. {outstanding.toLocaleString()})
              </button>
            )}
          </div>

          {/* Payment Method & Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="select-base text-xs font-medium"
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="ONLINE_TRANSFER">Online Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="input-base text-xs"
              />
            </div>
          </div>

          {/* Reference No */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reference / Cheque No {isNonCash && <span className="text-rose-500">*</span>}
            </label>
            <input
              type="text"
              placeholder={isNonCash ? "Transaction / Cheque # (Required)" : "Optional reference..."}
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className="input-base text-xs"
            />
          </div>

          {/* Payment Proof Upload (Optional / Non-Cash) */}
          {isNonCash && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Proof of Payment</label>
              {proofUrl ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold truncate">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <a href={proofUrl} target="_blank" rel="noreferrer" className="underline truncate">
                      View Uploaded Receipt
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProofUrl('')}
                    className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition cursor-pointer text-xs text-slate-600 font-medium">
                  {uploadingProof ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-brand" />
                      <span>Uploading receipt...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} className="text-slate-400" />
                      <span>Upload Bank / Transfer Slip</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    disabled={uploadingProof}
                    onChange={handleProofUpload}
                  />
                </label>
              )}
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Remarks (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Paid via Meezan Bank AC# 1234"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="input-base text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-secondary text-xs py-2 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingProof}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CreditCard size={14} />
                  Record Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
