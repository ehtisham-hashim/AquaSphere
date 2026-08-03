import { useRef } from 'react';
import { X, Plus, Trash2, Upload, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { getDefaultUnitPrice } from '../../constants/purchases';

export default function AddEditPurchaseModal({
  isOpen,
  onClose,
  onSubmit,
  error,
  submitting,
  vendorId,
  setVendorId,
  invoiceNo,
  setInvoiceNo,
  deliveryChallanNo,
  setDeliveryChallanNo,
  purchaseDate,
  setPurchaseDate,
  deliveredTo,
  setDeliveredTo,
  status = 'RECEIVED',
  setStatus,
  paymentStatus,
  setPaymentStatus,
  remarks,
  setRemarks,
  items,
  setItems,
  vendors,
  materials,
  user,
  fileInputRef,
  handleFileSelect,
  uploading,
  uploadedReceiptUrl,
  receiptFile,
  uploadError
}) {
  if (!isOpen) return null;

  const handleAddItemRow = () => {
    setItems(prev => [...prev, { itemId: '', quantity: '', unitPrice: '' }]);
  };

  const handleRemoveItemRow = (idx) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== idx));
    }
  };

  // Instant state update with fresh object reference for responsive dropdown
  const handleItemChange = (idx, field, value) => {
    setItems(prevItems => {
      const updated = [...prevItems];
      const selectedMat = field === 'itemId' ? materials.find(m => m.id === value) : null;
      updated[idx] = {
        ...updated[idx],
        [field]: value,
        ...(field === 'itemId' && selectedMat ? { unitPrice: getDefaultUnitPrice(selectedMat.name || selectedMat) } : {})
      };
      return updated;
    });
  };

  const grandTotal = items.reduce((acc, row) => {
    const qty = parseFloat(row.quantity) || 0;
    const price = parseFloat(row.unitPrice) || 0;
    return acc + (qty * price);
  }, 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-3xl">
          <div>
            <h3 className="text-xl font-black text-slate-800">Record New Purchase</h3>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Log raw material inventory & supplier bill</p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl border border-slate-200 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={onSubmit} className="p-6 space-y-5">
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
                className="w-full border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 outline-none text-sm bg-white font-bold text-slate-800"
                value={vendorId}
                onChange={e => setVendorId(e.target.value)}
                required
              >
                <option value="">-- Choose Vendor --</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name} ({v.phone || 'No Phone'})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Purchase Date *</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 outline-none text-sm bg-white font-bold text-slate-800"
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Invoice / Bill No</label>
              <input
                type="text"
                placeholder="e.g. INV-9921"
                className="w-full border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 outline-none text-sm bg-white font-medium text-slate-800"
                value={invoiceNo}
                onChange={e => setInvoiceNo(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Delivery Challan No</label>
              <input
                type="text"
                placeholder="e.g. CH-4401"
                className="w-full border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 outline-none text-sm bg-white font-medium text-slate-800"
                value={deliveryChallanNo}
                onChange={e => setDeliveryChallanNo(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Shipment Status</label>
              <select
                className="w-full border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 outline-none text-sm bg-white font-bold text-slate-800"
                value={status}
                onChange={e => setStatus && setStatus(e.target.value)}
              >
                <option value="RECEIVED">🟢 Received (Full)</option>
                <option value="PARTIALLY_RECEIVED">🔵 Partially Received</option>
                <option value="PENDING">🟡 Pending Shipment</option>
                <option value="CANCELLED">🔴 Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Payment Status</label>
              <select
                className="w-full border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 outline-none text-sm bg-white font-bold text-slate-800"
                value={paymentStatus}
                onChange={e => setPaymentStatus(e.target.value)}
              >
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid / On Credit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Delivered To *</label>
              <select
                className="w-full border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 outline-none text-sm bg-white font-bold text-slate-800"
                value={deliveredTo}
                onChange={e => setDeliveredTo(e.target.value)}
                required
              >
                <option value="FACTORY">Factory Floor</option>
                <option value="WAREHOUSE">Warehouse</option>
              </select>
            </div>
          </div>

          {/* Audit Received By Stamp */}
          <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs font-semibold text-indigo-900 flex justify-between items-center">
            <span>Recorded & Received By:</span>
            <span className="font-bold text-indigo-950">{user?.name || 'Production Manager'} ({user?.role || 'PM'})</span>
          </div>

          {/* Receipt Upload Card */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase text-slate-500">
                Bill / Receipt Photo <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              {uploadedReceiptUrl && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <CheckCircle size={14} /> Uploaded Successfully
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
                {uploading ? <Loader2 size={15} className="animate-spin text-indigo-600" /> : <Upload size={15} />}
                {uploading ? 'Saving File...' : 'Choose Receipt Image'}
              </button>
              {receiptFile && <span className="text-xs font-semibold text-slate-600 truncate max-w-[200px]">{receiptFile.name}</span>}
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
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
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
                      className="w-full border border-slate-200 rounded-lg p-2 focus:border-indigo-500 outline-none text-sm bg-white font-medium text-slate-800"
                      value={row.itemId}
                      onChange={e => handleItemChange(idx, 'itemId', e.target.value)}
                      required
                    >
                      <option value="">Select Material...</option>
                      {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Qty {selectedMat ? `(${selectedMat.unit})` : ''} *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      className="w-full border border-slate-200 rounded-lg p-2 focus:border-indigo-500 outline-none text-sm bg-white font-bold text-slate-800"
                      value={row.quantity}
                      onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                      placeholder="0"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Unit Price *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="w-full border border-slate-200 rounded-lg p-2 focus:border-indigo-500 outline-none text-sm bg-white font-bold text-slate-800"
                      value={row.unitPrice}
                      onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)}
                      placeholder="0"
                      required
                    />
                  </div>

                  <div className="col-span-2 text-right">
                    <span className="block text-[11px] font-bold text-slate-400 mb-1">Line Total</span>
                    <span className="text-xs font-black text-slate-800">Rs. {lineTotal.toLocaleString()}</span>
                  </div>

                  <div className="col-span-1 text-right">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grand Total & Remarks */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Remarks / Internal Notes</label>
            <input
              type="text"
              placeholder="e.g. Delivered via truck #4401"
              className="w-full border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 outline-none text-sm bg-white font-medium text-slate-800"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase text-slate-400">Grand Total</span>
              <p className="text-2xl font-black text-indigo-600">Rs. {grandTotal.toLocaleString()}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-600 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-sm font-bold shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? 'Saving Purchase...' : 'Save Purchase'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
