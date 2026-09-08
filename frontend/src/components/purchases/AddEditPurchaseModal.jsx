import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Upload, CheckCircle, Loader2, AlertCircle, FileText } from 'lucide-react';
import { API_URL as API } from '../../utils/api';
import { toast } from 'sonner';

const generateUniqueInvoiceCandidate = () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `PUR-${dateStr}-${randomSuffix}`;
};

export default function AddEditPurchaseModal({
  isOpen,
  onClose,
  onSuccess,
  initialData = null,
  vendors = [],
  materials = [],
  user,
  tenant
}) {
  const isEdit = Boolean(initialData);

  const [vendorId, setVendorId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [deliveryChallanNo, setDeliveryChallanNo] = useState('');
  const [deliveredTo, setDeliveredTo] = useState('FACTORY');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('RECEIVED');
  const [paymentStatus, setPaymentStatus] = useState('CREDIT');
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState([{ itemId: '', quantity: '', unitPrice: '' }]);

  // Receipt upload state
  const [uploadedReceiptUrl, setUploadedReceiptUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setVendorId(initialData.vendorId || '');
      setInvoiceNo(initialData.invoiceNo || '');
      setDeliveredTo(initialData.deliveredTo || 'FACTORY');
      setPurchaseDate(
        initialData.purchaseDate
          ? new Date(initialData.purchaseDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setStatus(initialData.status || 'RECEIVED');
      setPaymentStatus(initialData.paymentStatus === 'PAID' ? 'PAID' : 'CREDIT');

      // Parse remarks and challan if formatted as "Challan #... | ..."
      let rawRemarks = initialData.remarks || '';
      let extractedChallan = '';
      if (rawRemarks.includes('Challan #')) {
        const match = rawRemarks.match(/Challan #([^|]+)/);
        if (match) extractedChallan = match[1].trim();
      }
      setDeliveryChallanNo(extractedChallan);
      setRemarks(rawRemarks);

      if (initialData.items && initialData.items.length > 0) {
        setItems(
          initialData.items.map(it => ({
            itemId: it.itemId || '',
            quantity: String(it.quantity || ''),
            unitPrice: String(it.unitPrice || '')
          }))
        );
      } else {
        setItems([{ itemId: '', quantity: '', unitPrice: '' }]);
      }

      setUploadedReceiptUrl(initialData.receiptUrl || '');
      setUploadError('');
      setError('');
    } else {
      // Clean reset for new record with guaranteed auto-generated invoice number
      setVendorId('');
      setInvoiceNo(generateUniqueInvoiceCandidate());
      setDeliveryChallanNo('');
      setDeliveredTo('FACTORY');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setStatus('RECEIVED');
      setPaymentStatus('CREDIT');
      setRemarks('');
      setItems([{ itemId: '', quantity: '', unitPrice: '' }]);
      setUploadedReceiptUrl('');
      setUploadError('');
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleAddItemRow = () => {
    setItems(prev => [...prev, { itemId: '', quantity: '', unitPrice: '' }]);
  };

  const handleRemoveItemRow = (idx) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const handleItemChange = (idx, field, value) => {
    setItems(prevItems => {
      const updated = [...prevItems];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const grandTotal = items.reduce((acc, row) => {
    const qty = parseFloat(row.quantity) || 0;
    const price = parseFloat(row.unitPrice) || 0;
    return acc + (qty * price);
  }, 0);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('receipt', file);

      const res = await fetch(`${API}/purchases/upload-receipt`, {
        method: 'POST',
        body: formData,
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Upload failed');
      const url = json.receiptUrl || json.data?.receiptUrl;
      setUploadedReceiptUrl(url);
      toast.success('Bill receipt uploaded');
    } catch (err) {
      setUploadError(err.message || 'Failed to upload receipt');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!vendorId) return setError('Please select a vendor / supplier');
    if (items.some(i => !i.itemId || !i.quantity || isNaN(parseFloat(i.quantity)) || parseFloat(i.quantity) <= 0)) {
      return setError('Please provide valid materials and quantities (> 0) for all rows');
    }
    if (items.some(i => i.unitPrice === '' || isNaN(parseFloat(i.unitPrice)) || parseFloat(i.unitPrice) < 0)) {
      return setError('Please provide valid unit prices (>= 0) for all rows');
    }

    setSubmitting(true);
    try {
      const endpoint = isEdit ? `${API}/purchases/${initialData.id}` : `${API}/purchases`;
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        vendorId,
        invoiceNo: invoiceNo.trim() || undefined,
        deliveryChallanNo: deliveryChallanNo.trim() || undefined,
        receivedBy: `${user?.name || 'Staff'} (${user?.role || 'Staff'})`,
        purchaseDate,
        deliveredTo,
        status,
        paymentStatus,
        receiptUrl: uploadedReceiptUrl || null,
        remarks,
        items: items.map(i => ({
          itemId: i.itemId,
          quantity: parseFloat(i.quantity),
          unitPrice: parseFloat(i.unitPrice)
        }))
      };

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to save purchase');

      toast.success(isEdit ? 'Purchase updated and inventory reconciled' : 'Purchase recorded successfully');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-3xl">
          <div>
            <h3 className="text-xl font-black text-slate-800">
              {isEdit ? 'Edit Purchase Order' : 'Record New Purchase'}
            </h3>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {isEdit ? 'Modify raw materials, supplier rates, or quantities' : 'Log raw material inventory & supplier bill'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl border border-slate-200 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Vendor / Supplier *</label>
              <select
                className="select-base"
                value={vendorId}
                onChange={e => setVendorId(e.target.value)}
                required
              >
                <option value="">-- Choose Vendor --</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name} {v.phone ? `(${v.phone})` : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Purchase Date *</label>
              <input
                type="date"
                className="input-base"
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-xs font-bold uppercase text-slate-500 mb-1">
                <span>Purchase Invoice #</span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Auto-Generated & Locked</span>
              </label>
              <input
                type="text"
                readOnly
                disabled
                className="input-base bg-slate-100 text-slate-700 font-mono font-bold cursor-not-allowed border-slate-200 select-none shadow-none"
                value={invoiceNo}
                title="Invoice number is automatically generated and cannot be modified."
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Vendor Challan / Bilty / Bill # <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. CH-4401 or supplier's bill #"
                className="input-base"
                value={deliveryChallanNo}
                onChange={e => setDeliveryChallanNo(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Payment Method / Status</label>
              <select
                className="select-base"
                value={paymentStatus}
                onChange={e => setPaymentStatus(e.target.value)}
              >
                <option value="CREDIT">🔴 Vendor Khata (Credit / On Account)</option>
                <option value="PAID">🟢 Paid in Cash (COD / Immediate)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Delivered To *</label>
              <select
                className="select-base"
                value={deliveredTo}
                onChange={e => setDeliveredTo(e.target.value)}
                required
              >
                <option value="FACTORY">Factory Floor</option>
                <option value="WAREHOUSE">Warehouse</option>
              </select>
            </div>
          </div>

          {/* Bill / Receipt Photo */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase text-slate-500">
                Bill / Bilty Photo <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              {uploadedReceiptUrl && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <CheckCircle size={14} /> Attached
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl font-bold text-xs text-slate-700 flex items-center gap-2 shadow-xs transition-all"
              >
                {uploading ? <Loader2 size={15} className="animate-spin text-brand" /> : <Upload size={15} />}
                {uploading ? 'Uploading...' : 'Choose Receipt File'}
              </button>
              {uploadedReceiptUrl && (
                <a
                  href={uploadedReceiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1"
                >
                  <FileText size={13} /> View File
                </a>
              )}
            </div>
            {uploadError && <p className="text-xs font-bold text-rose-600 mt-1">{uploadError}</p>}
          </div>

          {/* Items Section */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Purchase Items</h4>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs font-bold text-brand hover:opacity-80 flex items-center gap-1"
              >
                <Plus size={16} /> Add Item Row
              </button>
            </div>

            {items.map((row, idx) => {
              const selectedMat = materials.find(m => m.id === row.itemId);
              const lineTotal = (parseFloat(row.quantity) || 0) * (parseFloat(row.unitPrice) || 0);

              return (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div className="col-span-5">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Raw Material *</label>
                    <select
                      className="w-full border border-slate-200 rounded-lg p-2 focus:border-brand outline-none text-sm bg-white font-medium text-slate-800"
                      value={row.itemId}
                      onChange={e => handleItemChange(idx, 'itemId', e.target.value)}
                      required
                    >
                      <option value="">Select Material...</option>
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.unit || 'unit'})</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Qty {selectedMat ? `(${selectedMat.unit || 'units'})` : ''} *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      className="w-full border border-slate-200 rounded-lg p-2 focus:border-brand outline-none text-sm bg-white font-bold text-slate-800"
                      value={row.quantity}
                      onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                      placeholder="0"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Unit Rate (PKR) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="w-full border border-slate-200 rounded-lg p-2 focus:border-brand outline-none text-sm bg-white font-bold text-slate-800"
                      value={row.unitPrice}
                      onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="col-span-2 text-right">
                    <span className="block text-[11px] font-bold text-slate-400 mb-1">Total</span>
                    <span className="text-xs font-black text-slate-800">Rs. {lineTotal.toLocaleString()}</span>
                  </div>

                  <div className="col-span-1 text-right">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                        title="Remove row"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Remarks / Internal Notes</label>
            <input
              type="text"
              placeholder="e.g. Delivered via truck #4401"
              className="input-base"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
          </div>

          {/* Bottom Bar */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase text-slate-400">Total Purchase Value</span>
              <p className="text-2xl font-bold font-mono text-brand">Rs. {grandTotal.toLocaleString()}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex items-center gap-1.5"
              >
                {submitting && <Loader2 size={15} className="animate-spin" />}
                <span>{submitting ? 'Saving...' : (isEdit ? 'Update Purchase' : 'Save Purchase')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
