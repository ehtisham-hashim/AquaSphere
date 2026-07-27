import { useState, useEffect, useRef } from 'react';
import {
  Plus, X, Receipt, ShoppingCart, Calendar, Building2,
  Trash2, Eye, Upload, CheckCircle, Loader2, AlertCircle
} from 'lucide-react';

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [vendorId, setVendorId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState([{ itemId: '', quantity: '', unitPrice: '' }]);

  // Receipt upload state
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [uploadedReceiptUrl, setUploadedReceiptUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const API = import.meta.env.VITE_API_URL;

  const fetchData = async () => {
    try {
      const [purchasesRes, vendorsRes, materialsRes] = await Promise.all([
        fetch(`${API}/purchases`, { credentials: 'include' }),
        fetch(`${API}/vendors`, { credentials: 'include' }),
        fetch(`${API}/items?type=RAW_MATERIAL`, { credentials: 'include' })
      ]);
      const pData = await purchasesRes.json();
      const vData = await vendorsRes.json();
      const mData = await materialsRes.json();
      if (pData.success) setPurchases(pData.data);
      if (vData.success) setVendors(vData.data.filter(v => !v.archivedAt));
      if (mData.success) setMaterials(mData.data.filter(m => !m.archivedAt));
    } catch (err) {
      console.error('Error fetching purchase data:', err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setVendorId('');
    setInvoiceNo('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setRemarks('');
    setItems([{ itemId: '', quantity: '', unitPrice: '' }]);
    setReceiptFile(null);
    setReceiptPreview('');
    setUploadedReceiptUrl('');
    setUploadError('');
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // ── Item rows ──────────────────────────────────────────────────────────────
  const handleAddItemRow = () => setItems([...items, { itemId: '', quantity: '', unitPrice: '' }]);
  const handleRemoveItemRow = (idx) => { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)); };
  const handleItemChange = (idx, field, value) => {
    const updated = [...items];
    updated[idx][field] = value;
    setItems(updated);
  };
  const grandTotal = items.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0) * (parseFloat(r.unitPrice) || 0), 0);

  // ── Receipt Upload ─────────────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setReceiptFile(file);
    setUploadedReceiptUrl('');
    setUploadError('');
    if (file.type.startsWith('image/')) {
      setReceiptPreview(URL.createObjectURL(file));
    } else {
      setReceiptPreview('pdf');
    }
  };

  const handleUploadReceipt = async () => {
    if (!receiptFile) return;
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('receipt', receiptFile);
      const res = await fetch(`${API}/purchases/upload-receipt`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Upload failed');
      setUploadedReceiptUrl(json.receiptUrl);
    } catch (err) {
      setUploadError(err.message || 'Failed to upload receipt');
    } finally {
      setUploading(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!vendorId) return setError('Please select a vendor');
    if (!uploadedReceiptUrl) return setError('Please upload the receipt/bill photo first');
    if (items.some(i => !i.itemId || !i.quantity || !i.unitPrice)) {
      return setError('Please fill all item rows (material, quantity, unit price)');
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          vendorId,
          invoiceNo,
          purchaseDate,
          receiptUrl: uploadedReceiptUrl,
          remarks,
          items: items.map(i => ({
            itemId: i.itemId,
            quantity: parseFloat(i.quantity),
            unitPrice: parseFloat(i.unitPrice)
          }))
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to save purchase');
      handleCloseModal();
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Purchases</h2>
          <p className="text-slate-500 text-sm mt-1">Log raw material purchases with mandatory receipt upload and automatic ledger updates.</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="btn-accent inline-flex items-center gap-2"
        >
          <Plus size={18} /> Record Purchase
        </button>
      </div>

      {/* Purchases List */}
      {purchases.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center flex flex-col items-center min-h-[350px] justify-center">
          <ShoppingCart size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 mb-1">No Purchases Recorded Yet</h3>
          <p className="text-slate-500 max-w-md text-sm mb-6">
            Log raw material purchases to automatically increase stock levels and record vendor accounts payable.
          </p>
          <button onClick={handleOpenModal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm text-sm">
            Record First Purchase
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-semibold text-slate-600 text-sm">Invoice #</th>
                  <th className="p-4 font-semibold text-slate-600 text-sm">Vendor</th>
                  <th className="p-4 font-semibold text-slate-600 text-sm">Date</th>
                  <th className="p-4 font-semibold text-slate-600 text-sm">Items</th>
                  <th className="p-4 font-semibold text-slate-600 text-sm">Grand Total</th>
                  <th className="p-4 font-semibold text-slate-600 text-sm">Receipt</th>
                  <th className="p-4 font-semibold text-slate-600 text-sm text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-indigo-600 text-sm">{p.invoiceNo || `#${p.id.slice(0, 8)}`}</td>
                    <td className="p-4 text-sm font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-slate-400" />
                        {p.vendor?.name || 'Unknown Vendor'}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        {new Date(p.purchaseDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">{p.items?.length || 0} material(s)</td>
                    <td className="p-4 text-sm font-bold text-slate-900">Rs {Number(p.grandTotal).toLocaleString()}</td>
                    <td className="p-4 text-sm">
                      {p.receiptUrl ? (
                        <a href={p.receiptUrl} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">
                          <Receipt size={14} /> View
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => setSelectedPurchase(p)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-medium">
                        <Eye size={16} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Record Purchase Modal ─────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden my-8">
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Record New Purchase</h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm">
                  <AlertCircle size={16} className="shrink-0" /> {error}
                </div>
              )}

              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Vendor *</label>
                  <select
                    className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm bg-white"
                    value={vendorId} onChange={e => setVendorId(e.target.value)} required
                  >
                    <option value="">Select Vendor...</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Invoice Number</label>
                  <input
                    className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="e.g. INV-9921" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Purchase Date *</label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                    value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} required
                  />
                </div>
              </div>

              {/* ── Receipt Upload ──────────────────────────────────────────── */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Bill / Receipt Photo <span className="text-rose-500">*</span>
                  </label>
                  {uploadedReceiptUrl && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <CheckCircle size={14} /> Uploaded
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
                    className="flex items-center gap-2 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                  >
                    <Upload size={16} /> Choose File
                  </button>
                  {receiptFile && !uploadedReceiptUrl && (
                    <button
                      type="button"
                      onClick={handleUploadReceipt}
                      disabled={uploading}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                    >
                      {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading...</> : 'Upload to Cloudinary'}
                    </button>
                  )}
                  {receiptFile && <span className="text-xs text-slate-500 truncate max-w-[180px]">{receiptFile.name}</span>}
                </div>

                {receiptPreview && receiptPreview !== 'pdf' && !uploadedReceiptUrl && (
                  <img src={receiptPreview} alt="Receipt preview" className="h-24 rounded-lg object-cover border border-slate-200" />
                )}
                {receiptPreview === 'pdf' && !uploadedReceiptUrl && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                    <Receipt size={14} /> PDF selected — click "Upload to Cloudinary" to proceed
                  </div>
                )}
                {uploadedReceiptUrl && (
                  <div className="flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg p-2">
                    <CheckCircle size={14} />
                    <a href={uploadedReceiptUrl} target="_blank" rel="noreferrer" className="underline hover:no-underline truncate">
                      {uploadedReceiptUrl}
                    </a>
                  </div>
                )}
                {uploadError && (
                  <div className="text-xs text-rose-600 bg-rose-50 rounded-lg p-2">{uploadError}</div>
                )}
              </div>

              {/* Items Section */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Purchase Items</h4>
                  <button type="button" onClick={handleAddItemRow}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    <Plus size={16} /> Add Item
                  </button>
                </div>

                {items.map((row, idx) => {
                  const selectedMat = materials.find(m => m.id === row.itemId);
                  const lineTotal = (parseFloat(row.quantity) || 0) * (parseFloat(row.unitPrice) || 0);
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="col-span-5">
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Raw Material *</label>
                        <select
                          className="w-full border border-slate-200 rounded-lg p-2 focus:border-indigo-500 outline-none text-sm bg-white"
                          value={row.itemId} onChange={e => handleItemChange(idx, 'itemId', e.target.value)} required
                        >
                          <option value="">Select Material...</option>
                          {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          Qty {selectedMat ? `(${selectedMat.unit})` : ''} *
                        </label>
                        <input type="number" step="0.01" min="0.01"
                          className="w-full border border-slate-200 rounded-lg p-2 focus:border-indigo-500 outline-none text-sm bg-white"
                          value={row.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                          placeholder="0" required />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Unit Price (Rs) *</label>
                        <input type="number" step="0.01" min="0.01"
                          className="w-full border border-slate-200 rounded-lg p-2 focus:border-indigo-500 outline-none text-sm bg-white"
                          value={row.unitPrice} onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)}
                          placeholder="0.00" required />
                      </div>
                      <div className="col-span-2 text-right">
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Total</label>
                        <div className="text-sm font-bold text-slate-800 pt-1">Rs {lineTotal.toLocaleString()}</div>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button type="button" onClick={() => handleRemoveItemRow(idx)} disabled={items.length === 1}
                          className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grand Total */}
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex justify-between items-center">
                <span className="text-sm font-bold text-indigo-900">Grand Total Amount</span>
                <span className="text-xl font-black text-indigo-700">Rs {grandTotal.toLocaleString()}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Remarks / Note</label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                  rows="2" value={remarks} onChange={e => setRemarks(e.target.value)}
                  placeholder="Optional purchase note..."
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={handleCloseModal}
                  className="px-4 py-2.5 text-slate-600 font-medium hover:bg-slate-50 rounded-lg text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={submitting || !uploadedReceiptUrl}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-lg font-bold shadow-sm text-sm flex items-center gap-2">
                  {submitting ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Purchase Details Modal ──────────────────────────────────────────── */}
      {selectedPurchase && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden">
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Purchase: {selectedPurchase.invoiceNo || selectedPurchase.id}
                </h3>
                <p className="text-xs text-slate-500">
                  Logged on {new Date(selectedPurchase.createdAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setSelectedPurchase(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Vendor</span>
                  <span className="font-bold text-slate-800">{selectedPurchase.vendor?.name}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Date</span>
                  <span className="font-bold text-slate-800">
                    {new Date(selectedPurchase.purchaseDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-slate-400 block font-medium">Receipt</span>
                  {selectedPurchase.receiptUrl ? (
                    <a href={selectedPurchase.receiptUrl} target="_blank" rel="noreferrer"
                      className="text-indigo-600 font-semibold hover:underline text-sm">
                      View Receipt Photo ↗
                    </a>
                  ) : (
                    <span className="text-slate-500 text-sm">None</span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Items Purchased</h4>
                <table className="w-full text-left border border-slate-100 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                    <tr>
                      <th className="p-3">Item</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Unit Price</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {selectedPurchase.items?.map(it => (
                      <tr key={it.id}>
                        <td className="p-3 font-semibold text-slate-800">{it.item?.name}</td>
                        <td className="p-3 text-slate-600">{Number(it.quantity)} {it.item?.unit}</td>
                        <td className="p-3 text-slate-600">Rs {Number(it.unitPrice).toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-slate-800">Rs {Number(it.total).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <span className="font-bold text-slate-700">Grand Total</span>
                <span className="text-xl font-black text-indigo-600">
                  Rs {Number(selectedPurchase.grandTotal).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
