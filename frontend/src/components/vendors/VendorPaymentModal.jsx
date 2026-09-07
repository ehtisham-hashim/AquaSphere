import { useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';

export default function VendorPaymentModal({
  isOpen,
  onClose,
  onSubmit,
  selectedVendor,
  paymentData,
  setPaymentData,
  paymentSubmitting,
  tenant
}) {
  const [uploadingProof, setUploadingProof] = useState(false);

  if (!isOpen || !selectedVendor) return null;

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
      const json = await res.json();
      if (json.success && json.proofUrl) {
        setPaymentData(prev => ({ ...prev, proofUrl: json.proofUrl }));
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

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Record Vendor Payment</h3>
            <p className="text-xs text-slate-500">Paying: {selectedVendor.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Outstanding Payable Balance</span>
            <span className="text-base font-bold font-mono text-[var(--brand)]">
              Rs {Number(selectedVendor.payableBalance || 0).toLocaleString()}
            </span>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-bold uppercase text-slate-500 text-[11px]">Payment Amount (Rs) *</label>
              {Number(selectedVendor.payableBalance || 0) > 0 && (
                <button
                  type="button"
                  onClick={() => setPaymentData({ ...paymentData, amount: String(selectedVendor.payableBalance) })}
                  className="text-[11px] font-bold text-[var(--brand)] hover:opacity-80 bg-[var(--brand-light)] px-2 py-0.5 rounded-md transition"
                >
                  Pay Full (Rs {Number(selectedVendor.payableBalance).toLocaleString()})
                </button>
              )}
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={Number(selectedVendor.payableBalance || 0) > 0 ? selectedVendor.payableBalance : undefined}
              className="input-base font-mono font-bold"
              value={paymentData.amount}
              onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase text-slate-500 mb-1 text-[11px]">Payment Method *</label>
              <select
                className="select-base"
                value={paymentData.paymentMethod}
                onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="ONLINE_TRANSFER">Online Transfer</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Date *</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500"
                value={paymentData.paymentDate}
                onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reference / Cheque #</label>
            <input
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500"
              value={paymentData.referenceNo}
              onChange={(e) => setPaymentData({ ...paymentData, referenceNo: e.target.value })}
              placeholder="e.g. Bank Txn #9412 or Cheque #1092"
            />
          </div>

          {(paymentData.paymentMethod === 'BANK_TRANSFER' || paymentData.paymentMethod === 'CHEQUE' || paymentData.paymentMethod === 'ONLINE_TRANSFER') && (
            <div className="space-y-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Payment Proof (Receipt/Slip) <span className="text-red-500 ml-1">*</span>
              </label>
              
              {!paymentData.proofUrl ? (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors bg-slate-50">
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
                          <Loader2 size={32} className="animate-spin text-emerald-600" />
                          <span className="text-sm font-semibold text-emerald-600">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={32} className="text-slate-400" />
                          <span className="text-sm font-bold text-slate-700">Click to upload payment proof</span>
                          <span className="text-xs text-slate-500">or drag and drop</span>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              ) : (
                <div className="relative border border-emerald-200 rounded-xl p-3 bg-emerald-50/30">
                  <div className="flex items-center gap-3">
                    <img 
                      src={paymentData.proofUrl} 
                      alt="Payment proof" 
                      className="w-16 h-16 object-cover rounded-lg border border-emerald-200"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-emerald-800">✓ Proof uploaded successfully</p>
                      <a 
                        href={paymentData.proofUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-xs text-emerald-600 hover:underline"
                      >
                        View full image
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaymentData({ ...paymentData, proofUrl: '' })}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove proof"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              )}
              
              <p className="text-[11px] text-slate-500">
                Accepted formats: JPEG, JPG, PNG, WEBP only • Max 5MB • PDF not supported
              </p>
            </div>
          )}

          <div>
            <label className="block font-bold uppercase text-slate-500 mb-1 text-[11px]">Remarks</label>
            <input
              className="input-base"
              value={paymentData.remarks}
              onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
              placeholder="Payment notes..."
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            {(() => {
              const requiresProof = paymentData.paymentMethod === 'BANK_TRANSFER' || paymentData.paymentMethod === 'CHEQUE' || paymentData.paymentMethod === 'ONLINE_TRANSFER';
              const isSubmitDisabled = paymentSubmitting || uploadingProof || (requiresProof && !paymentData.proofUrl) || Number(selectedVendor?.payableBalance || 0) <= 0 || !paymentData.amount || Number(paymentData.amount) <= 0;

              return (
                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="btn-primary flex items-center gap-1.5"
                >
                  {paymentSubmitting ? (
                    <><Loader2 size={14} className="animate-spin" /> Recording...</>
                  ) : uploadingProof ? (
                    <><Loader2 size={14} className="animate-spin" /> Uploading Slip...</>
                  ) : (
                    'Record Payment'
                  )}
                </button>
              );
            })()}
          </div>
        </form>
      </div>
    </div>
  );
}
