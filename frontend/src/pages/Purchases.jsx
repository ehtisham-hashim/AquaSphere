import { useState, useEffect, useRef } from 'react';
import {
  Plus, X, Receipt, ShoppingCart, Calendar, Building2,
  Trash2, Eye, Upload, CheckCircle, Loader2, AlertCircle,
  Search, Filter, Printer, ShieldCheck, Clock, CheckCircle2,
  TrendingUp, CreditCard
} from 'lucide-react';
import { API_URL as API } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { INVOICE_CONFIG, DEFAULT_DELIVERED_LOCATION, getDefaultUnitPrice } from '../constants/purchases';
import { toast } from 'sonner';
import { DeleteConfirmationModal } from '../components/ui';

export default function Purchases() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [printPurchase, setPrintPurchase] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL');

  // Form State
  const [vendorId, setVendorId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [deliveryChallanNo, setDeliveryChallanNo] = useState('');
  const [deliveredTo, setDeliveredTo] = useState('FACTORY');
  const [status, setStatus] = useState('RECEIVED'); // PENDING, RECEIVED, PARTIALLY_RECEIVED, CANCELLED
  const [paymentStatus, setPaymentStatus] = useState('PAID'); // PAID, PARTIAL, CREDIT
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

  const fetchData = async () => {
    try {
      const qParams = new URLSearchParams();
      if (searchQuery) qParams.append('search', searchQuery);
      if (dateFilter) qParams.append('dateFilter', dateFilter);

      const [purchasesRes, vendorsRes, materialsRes] = await Promise.all([
        fetch(`${API}/purchases?${qParams.toString()}`, { credentials: 'include' }),
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, [searchQuery, dateFilter]);

  const resetForm = () => {
    setVendorId('');
    setInvoiceNo(INVOICE_CONFIG.GENERATE_INVOICE_NO());
    setDeliveredTo(DEFAULT_DELIVERED_LOCATION);
    setStatus('RECEIVED');
    setPaymentStatus('PAID');
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
    if (field === 'itemId') {
      const selected = materials.find(m => m.id === value);
      if (selected) updated[idx].unitPrice = getDefaultUnitPrice(selected);
    }
    setItems(updated);
  };

  // ── Receipt Upload ────────────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
    setUploadError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('receipt', file);

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
          deliveryChallanNo,
          receivedBy: `${user?.name || 'Production Manager'} (${user?.role || 'PM'})`,
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
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to save purchase');
      
      toast.success(
        <div className="space-y-1">
          <div className="font-bold text-slate-900">Purchase Order Created!</div>
          <div className="text-xs text-emerald-700 font-semibold space-y-0.5">
            <div>✓ Raw Material Stock Updated</div>
            <div>✓ Vendor Balance Updated</div>
            <div>✓ Audit Log Created</div>
          </div>
        </div>
      );
      handleCloseModal();
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovePurchase = async (pId) => {
    setVerifyingId(pId);
    try {
      const res = await fetch(`${API}/purchases/${pId}/approve`, {
        method: 'POST',
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Purchase verified successfully');
        fetchData();
      }
    } catch (err) {
      console.error('Error approving purchase:', err);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleQuickStatusChange = async (purchaseId, newStatus, newPaymentStatus) => {
    setUpdatingStatusId(purchaseId);
    try {
      const body = {};
      if (newStatus) body.status = newStatus;
      if (newPaymentStatus) body.paymentStatus = newPaymentStatus;

      const res = await fetch(`${API}/purchases/${purchaseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Status updated successfully');
        fetchData();
        if (selectedPurchase?.id === purchaseId) {
          setSelectedPurchase(json.data);
        }
      }
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const [purchaseToDelete, setPurchaseToDelete] = useState(null);

  const handleConfirmDeletePurchase = async () => {
    if (!purchaseToDelete) return;
    const pId = purchaseToDelete.id;
    setDeletingId(pId);
    try {
      const res = await fetch(`${API}/purchases/${pId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Purchase deleted and inventory reversed');
        setPurchaseToDelete(null);
        fetchData();
        if (selectedPurchase?.id === pId) setSelectedPurchase(null);
      } else {
        toast.error(json.message || 'Failed to delete purchase');
      }
    } catch (err) {
      console.error('Error deleting purchase:', err);
      toast.error('Error deleting purchase');
    } finally {
      setDeletingId(null);
    }
  };

  const grandTotal = items.reduce((acc, i) => {
    const qty = parseFloat(i.quantity) || 0;
    const price = parseFloat(i.unitPrice) || 0;
    return acc + (qty * price);
  }, 0);

  // Status Badge Helpers
  const renderFulfillmentBadge = (st) => {
    switch (st) {
      case 'RECEIVED':
        return <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold">🟢 Received</span>;
      case 'PARTIALLY_RECEIVED':
        return <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-200 text-xs px-2.5 py-0.5 rounded-full font-bold">🔵 Partially Received</span>;
      case 'PENDING':
        return <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-0.5 rounded-full font-bold">🟡 Pending</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs px-2.5 py-0.5 rounded-full font-bold">🔴 Cancelled</span>;
      default:
        return <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 text-xs px-2.5 py-0.5 rounded-full font-bold">{st || 'RECEIVED'}</span>;
    }
  };

  const renderPaymentBadge = (pst) => {
    switch (pst) {
      case 'PAID':
        return <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold">🟢 Paid</span>;
      case 'PARTIAL':
        return <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-200 text-xs px-2.5 py-0.5 rounded-full font-bold">🔵 Partial</span>;
      case 'CREDIT':
      case 'UNPAID':
        return <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs px-2.5 py-0.5 rounded-full font-bold">🔴 Credit</span>;
      default:
        return <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 text-xs px-2.5 py-0.5 rounded-full font-bold">{pst || 'PAID'}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Raw Material Purchases</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Record vendor procurement, shipment fulfillment, and payment credit status.</p>
        </div>
        {['OWNER', 'PRODUCTION_MANAGER'].includes(user?.role) && (
          <button
            onClick={handleOpenModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            <Plus size={18} className="stroke-[2.5]" /> <span>Record New Purchase</span>
          </button>
        )}
      </div>

      {/* Controls: Search & Date Filters */}
      <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-96">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Invoice # or Vendor Name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-indigo-500 bg-slate-50/50 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={16} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase">Period:</span>
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-700 outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Records</option>
            <option value="TODAY">Today</option>
            <option value="WEEK">Last 7 Days</option>
            <option value="MONTH">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* ── Purchase Table ────────────────────────────────────────────────── */}
      {purchases.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 text-center flex flex-col items-center min-h-[350px] justify-center">
          <ShoppingCart size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 mb-1">No Purchase Records Found</h3>
          <p className="text-slate-500 max-w-md text-sm mb-6">
            Log raw material purchases to automatically increase plant stock levels and manage vendor accounts.
          </p>
          {['OWNER', 'PRODUCTION_MANAGER'].includes(user?.role) && (
            <button onClick={handleOpenModal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md text-sm">
              Record First Purchase
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Invoice #</th>
                  <th className="p-4">Vendor</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Fulfillment Status</th>
                  <th className="p-4">Payment Status</th>
                  <th className="p-4">Verification</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {purchases.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-slate-600">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Calendar size={14} className="text-slate-400" />
                        {new Date(p.purchaseDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-indigo-600">
                      {p.invoiceNo || `#${p.id.slice(0, 8)}`}
                    </td>
                    <td className="p-4 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-slate-400" />
                        {p.vendor?.name || 'Unknown Vendor'}
                      </div>
                    </td>
                    <td className="p-4 font-mono font-black text-slate-900 text-base">
                      Rs {Number(p.grandTotal).toLocaleString('en-PK')}
                    </td>
                    <td className="p-4">
                      <select
                        value={p.status || 'RECEIVED'}
                        onChange={(e) => handleQuickStatusChange(p.id, e.target.value, null)}
                        disabled={updatingStatusId === p.id}
                        className="bg-transparent font-bold text-xs cursor-pointer border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="RECEIVED">🟢 Received</option>
                        <option value="PARTIALLY_RECEIVED">🔵 Partially Received</option>
                        <option value="PENDING">🟡 Pending</option>
                        <option value="CANCELLED">🔴 Cancelled</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <select
                        value={p.paymentStatus || 'PAID'}
                        onChange={(e) => handleQuickStatusChange(p.id, null, e.target.value)}
                        disabled={updatingStatusId === p.id}
                        className="bg-transparent font-bold text-xs cursor-pointer border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="PAID">🟢 Paid</option>
                        <option value="PARTIAL">🔵 Partial</option>
                        <option value="CREDIT">🔴 Credit</option>
                      </select>
                    </td>
                    <td className="p-4 text-xs font-medium">
                      {p.verifiedBy ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs">
                            <ShieldCheck size={14} /> Verified
                          </span>
                          <div className="text-[10px] text-slate-500 font-semibold mt-1">
                            Verified By: <span className="text-slate-800 font-bold">{p.verifiedBy || 'Admin'}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            Verified On: {new Date(p.verifiedAt || p.updatedAt || p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      ) : ['ACCOUNTANT', 'OWNER'].includes(user?.role) ? (
                        <button
                          onClick={() => handleApprovePurchase(p.id)}
                          disabled={verifyingId === p.id}
                          className="px-3 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-full font-bold text-xs transition"
                        >
                          {verifyingId === p.id ? 'Verifying...' : 'Verify Bill'}
                        </button>
                      ) : (
                        <span className="text-slate-400 italic">Unverified</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setSelectedPurchase(p)}
                          className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors inline-flex items-center gap-1 text-xs font-bold bg-slate-100">
                          <Eye size={15} /> View
                        </button>
                        <button onClick={() => setPrintPurchase(p)}
                          className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors inline-flex items-center gap-1 text-xs font-bold bg-slate-100">
                          <Printer size={15} /> Print
                        </button>
                        {user?.role === 'OWNER' && (
                          <button
                            onClick={() => setPurchaseToDelete(p)}
                            disabled={deletingId === p.id}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors inline-flex items-center text-xs font-bold bg-rose-50"
                            title="Delete Purchase"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50 overflow-hidden">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-[5vh]">
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-black text-slate-800">Record New Purchase Batch</h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
              {error && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-medium">
                  <AlertCircle size= {16} className="shrink-0" /> {error}
                </div>
              )}

              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Vendor *</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 outline-none text-sm bg-white font-semibold text-slate-800"
                    value={vendorId} onChange={e => setVendorId(e.target.value)} required
                  >
                    <option value="">Select Vendor...</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Invoice Number</label>
                  <input
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 outline-none text-sm font-mono font-bold"
                    placeholder="e.g. INV-9921" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Delivery Challan No.</label>
                  <input
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 outline-none text-sm font-mono font-bold text-slate-800"
                    placeholder="e.g. DC-2026-081" value={deliveryChallanNo} onChange={e => setDeliveryChallanNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Received By (Auto)</label>
                  <input
                    disabled
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-100 text-slate-600 font-semibold text-xs cursor-not-allowed"
                    value={`${user?.name || 'Production Manager'} (${user?.role || 'PM'})`}
                  />
                </div>
              </div>

              {/* Status & Location Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Shipment Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 outline-none text-sm font-bold bg-white text-slate-800"
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
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 outline-none text-sm font-bold bg-white text-slate-800"
                  >
                    <option value="PAID">🟢 Paid (Full)</option>
                    <option value="PARTIAL">🔵 Partial Payment</option>
                    <option value="CREDIT">🔴 Credit (Unpaid)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Delivered To *</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 outline-none text-sm bg-white font-bold text-slate-800"
                    value={deliveredTo} onChange={e => setDeliveredTo(e.target.value)} required
                  >
                    <option value="FACTORY">Factory</option>
                    <option value="WAREHOUSE">Warehouse</option>
                  </select>
                </div>
              </div>

              {/* ── Receipt Upload ──────────────────────────────────────────── */}
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
              </div>

              {/* Items Section */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Purchase Items</h4>
                  <button type="button" onClick={handleAddItemRow}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
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
                          className="w-full border border-slate-200 rounded-lg p-2 focus:border-indigo-500 outline-none text-sm bg-white font-medium"
                          value={row.itemId} onChange={e => handleItemChange(idx, 'itemId', e.target.value)} required
                        >
                          <option value="">Select Material...</option>
                          {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                          Qty {selectedMat ? `(${selectedMat.unit})` : ''} *
                        </label>
                        <input type="number" step="any" min="0.001"
                          className="w-full border border-slate-200 rounded-lg p-2 focus:border-indigo-500 outline-none text-sm bg-white font-bold text-slate-800"
                          value={row.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                          placeholder="0" required />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Unit Price (Rs)</label>
                        <input type="number" step="any" min="0.01"
                          className="w-full border border-slate-200 rounded-lg p-2 focus:border-indigo-500 outline-none text-sm bg-white font-bold text-slate-800"
                          value={row.unitPrice} onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)}
                          placeholder="0" required />
                      </div>
                      <div className="col-span-2 text-right">
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Total</label>
                        <div className="text-sm font-black text-slate-800 pt-1">Rs {lineTotal.toLocaleString()}</div>
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
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex justify-between items-center">
                <span className="text-sm font-bold text-indigo-900">Total Purchase Amount</span>
                <span className="text-2xl font-black text-indigo-700">Rs {grandTotal.toLocaleString('en-PK')}</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Remarks / Note</label>
                <textarea
                  className="w-full border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none text-sm"
                  rows="2" value={remarks} onChange={e => setRemarks(e.target.value)}
                  placeholder="Optional purchase note..."
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={handleCloseModal}
                  className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg text-sm flex items-center gap-2">
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
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-800">
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
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
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Shipment</span>
                  {renderFulfillmentBadge(selectedPurchase.status)}
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Payment</span>
                  {renderPaymentBadge(selectedPurchase.paymentStatus)}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Items Purchased</h4>
                <table className="w-full text-left border border-slate-200 rounded-xl overflow-hidden text-sm">
                  <thead className="bg-slate-100 text-xs font-bold text-slate-700">
                    <tr>
                      <th className="p-3">Item</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Unit Price</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPurchase.items?.map(it => (
                      <tr key={it.id}>
                        <td className="p-3 font-semibold text-slate-800">{it.item?.name}</td>
                        <td className="p-3 text-slate-600 font-bold">{Number(it.quantity)} {it.item?.unit}</td>
                        <td className="p-3 text-slate-600">Rs {Number(it.unitPrice).toLocaleString()}</td>
                        <td className="p-3 text-right font-black text-slate-900">Rs {Number(it.total).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <span className="font-bold text-slate-700">Total Purchase Amount</span>
                <span className="text-2xl font-black text-indigo-600">
                  Rs {Number(selectedPurchase.grandTotal).toLocaleString('en-PK')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Printable Bill Modal ────────────────────────────────────────────── */}
      {printPurchase && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100 p-8 space-y-6">
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-2xl font-black text-indigo-600">PURCHASE INVOICE</h2>
                <p className="text-xs text-slate-500 mt-1">Official Purchase Voucher</p>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-slate-800">{printPurchase.invoiceNo || printPurchase.id}</div>
                <div className="text-xs text-slate-500">{new Date(printPurchase.purchaseDate).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl">
              <div>
                <span className="text-slate-400 font-medium block">Vendor:</span>
                <span className="font-bold text-slate-800 text-sm">{printPurchase.vendor?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Delivered Location:</span>
                <span className="font-bold text-indigo-700 text-sm">{printPurchase.deliveredTo || 'FACTORY'}</span>
              </div>
            </div>

            <div>
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 font-semibold text-slate-700">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5">Qty</th>
                    <th className="p-2.5">Unit Price</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {printPurchase.items?.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-medium text-slate-800">{it.item?.name}</td>
                      <td className="p-2.5 text-slate-600">{Number(it.quantity)} {it.item?.unit}</td>
                      <td className="p-2.5 text-slate-600">Rs {Number(it.unitPrice).toLocaleString()}</td>
                      <td className="p-2.5 text-right font-bold text-slate-800">Rs {Number(it.total).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-700 text-sm">Total Payable</span>
              <span className="text-2xl font-black text-indigo-600">Rs {Number(printPurchase.grandTotal).toLocaleString('en-PK')}</span>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button onClick={() => setPrintPurchase(null)} className="px-4 py-2 text-slate-600 font-semibold text-xs hover:bg-slate-100 rounded-xl">
                Close
              </button>
              <button onClick={() => window.print()} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5">
                <Printer size={14} /> Print Now
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={Boolean(purchaseToDelete)}
        title="Delete Purchase Record"
        message={`Are you sure you want to delete Purchase Invoice #${purchaseToDelete?.invoiceNo || purchaseToDelete?.id?.substring(0, 8)}? This will reverse raw material inventory additions and remove vendor ledger entries.`}
        confirmText="Delete Purchase"
        cancelText="Cancel"
        loading={Boolean(deletingId)}
        onConfirm={handleConfirmDeletePurchase}
        onClose={() => setPurchaseToDelete(null)}
      />
    </div>
  );
}
