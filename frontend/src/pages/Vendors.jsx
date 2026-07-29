import { useState, useEffect } from 'react';
import { 
  Plus, X, Search, Building2, Phone, Mail, MapPin, Archive, RefreshCw, 
  Edit2, CreditCard, Eye, Loader2, Upload, FileText, ShoppingCart, 
  Receipt, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Vendors() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

  // Role Permissions

  const isPM = user?.role === 'PRODUCTION_MANAGER';
  const isOwnerOrAccountant = user?.role === 'OWNER' || user?.role === 'ACCOUNTANT';

  const canAddEdit = isOwnerOrAccountant || isPM;
  const canPayOrArchive = isOwnerOrAccountant;

  // Vendor Detail Modal & Tabs
  const [selectedVendorDetail, setSelectedVendorDetail] = useState(null);

  const [profileTab, setProfileTab] = useState('ledger'); // 'ledger', 'purchases', 'payments'

  // Vendor Payment Modal & Proof State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedVendorForPayment, setSelectedVendorForPayment] = useState(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);

  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'CASH',
    referenceNo: '',
    proofUrl: '',
    remarks: '',
    paymentDate: new Date().toISOString().split('T')[0]
  });

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/vendors?includeArchived=${includeArchived}`, {
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) setVendors(json.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeArchived]);

  const handleOpenAdd = () => {
    setEditingVendor(null);
    setFormData({ name: '', phone: '', email: '', address: '', notes: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v) => {
    setEditingVendor(v);
    setFormData({
      name: v.name || '',
      phone: v.phone || '',
      email: v.email || '',
      address: v.address || '',
      notes: v.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleOpenPayment = (v) => {
    setSelectedVendorForPayment(v);
    setPaymentData({
      amount: '',
      paymentMethod: 'CASH',
      referenceNo: '',
      proofUrl: '',
      remarks: '',
      paymentDate: new Date().toISOString().split('T')[0]
    });
    setIsPaymentModalOpen(true);
  };

  const handleViewDetails = async (v) => {
    setProfileTab('ledger');
    try {
      const res = await fetch(`${API_URL}/vendors/${v.id}`, {
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        setSelectedVendorDetail(json.data);
      }
    } catch (err) {
      console.error('Error fetching vendor details:', err);
      toast.error('Failed to load vendor profile');
    }
  };

  const handleUploadPaymentProof = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingProof(true);
    try {
      const fd = new FormData();
      fd.append('receipt', file);

      const res = await fetch(`${API_URL}/purchases/upload-receipt`, {
        method: 'POST',
        body: fd,
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success && json.url) {
        setPaymentData(prev => ({ ...prev, proofUrl: json.url }));
        toast.success('Bank payment proof uploaded!');
      } else {
        toast.error('Failed to upload proof');
      }
    } catch (err) {
      toast.error('Error uploading payment proof');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error('Vendor Name and Phone are required');
      return;
    }

    const url = editingVendor
      ? `${API_URL}/vendors/${editingVendor.id}`
      : `${API_URL}/vendors`;

    const method = editingVendor ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || 'Error saving vendor');
        return;
      }
      toast.success(editingVendor ? 'Vendor updated successfully' : 'Vendor added successfully');
      setIsModalOpen(false);
      fetchVendors();
    } catch (err) {
      toast.error('Failed to save vendor');
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      toast.error('Please enter a valid payment amount greater than zero');
      return;
    }

    setPaymentSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/vendors/${selectedVendorForPayment.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
        credentials: 'include'
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || 'Failed to record payment');
        return;
      }
      toast.success('Vendor payment recorded successfully');
      setIsPaymentModalOpen(false);
      fetchVendors();
      if (selectedVendorDetail && selectedVendorDetail.id === selectedVendorForPayment.id) {
        handleViewDetails(selectedVendorForPayment);
      }
    } catch (err) {
      toast.error('Error submitting payment');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleToggleArchive = async (v) => {
    const isArchived = !!v.archivedAt;
    const action = isArchived ? 'restore' : 'archive';
    if (!confirm(`Are you sure you want to ${action} ${v.name}?`)) return;

    try {
      const res = await fetch(`${API_URL}/vendors/${v.id}/${action}`, {
        method: 'PATCH',
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Vendor ${action}d successfully`);
        fetchVendors();
      } else {
        toast.error(json.message || `Failed to ${action} vendor`);
      }
    } catch (err) {
      toast.error(`Failed to ${action} vendor`);
    }
  };

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.phone && v.phone.includes(search))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              PROCUREMENT & PAYABLES
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mt-1">Vendor Directory</h2>
          <p className="text-slate-500 text-sm">Manage raw material suppliers & accounts payable ledger</p>
        </div>

        {canAddEdit && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition shadow-md flex items-center gap-2"
          >
            <Plus size={18} /> Add Vendor
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="search"
            placeholder="Search vendor by name or phone..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600 font-medium cursor-pointer self-start sm:self-auto">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
          />
          Show Archived Vendors
        </label>
      </div>

      {/* Main Vendor Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="p-4">Vendor</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Address</th>
                <th className="p-4">Status</th>
                <th className="p-4">Total Purchases</th>
                <th className="p-4">Total Paid</th>
                <th className="p-4">Payable Balance</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading vendor records...
                  </td>
                </tr>
              ) : filteredVendors.map(v => (
                <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{v.name}</div>
                        {v.notes && <div className="text-xs text-slate-400 max-w-xs truncate">{v.notes}</div>}
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      {v.phone && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <Phone size={14} className="text-slate-400" /> {v.phone}
                        </div>
                      )}
                      {v.email && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Mail size={14} className="text-slate-400" /> {v.email}
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="p-4">
                    {v.address ? (
                      <div className="flex items-center gap-1 text-xs text-slate-600 max-w-xs truncate">
                        <MapPin size={14} className="text-slate-400 shrink-0" /> {v.address}
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>

                  <td className="p-4">
                    {v.archivedAt ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                        ARCHIVED
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                        ACTIVE
                      </span>
                    )}
                  </td>

                  <td className="p-4 font-semibold text-slate-700">
                    Rs {Number(v.totalPurchases || 0).toLocaleString()}
                  </td>

                  <td className="p-4 font-semibold text-emerald-700">
                    Rs {Number(v.totalPaid || 0).toLocaleString()}
                  </td>

                  <td className="p-4 font-bold text-indigo-700">
                    Rs {Number(v.payableBalance || 0).toLocaleString()}
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {canPayOrArchive && !v.archivedAt && (
                        <button
                          onClick={() => handleOpenPayment(v)}
                          className="px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors inline-flex items-center gap-1 shadow-xs"
                          title="Record Payment to Vendor"
                        >
                          <CreditCard size={14} /> Pay
                        </button>
                      )}

                      <button
                        onClick={() => handleViewDetails(v)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors inline-flex items-center gap-1"
                        title="View Vendor Profile & History"
                      >
                        <Eye size={14} /> Profile
                      </button>

                      {canAddEdit && (
                        <button
                          onClick={() => handleOpenEdit(v)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Vendor"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}

                      {canPayOrArchive && (
                        <button
                          onClick={() => handleToggleArchive(v)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            v.archivedAt
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-rose-500 hover:bg-rose-50'
                          }`}
                          title={v.archivedAt ? 'Restore Vendor' : 'Archive Vendor'}
                        >
                          {v.archivedAt ? <RefreshCw size={16} /> : <Archive size={16} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && filteredVendors.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-500">
                    No vendor records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit Vendor Modal ────────────────────────────────────────── */}
      {isModalOpen && canAddEdit && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">
                {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Vendor Name *</label>
                <input
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. ABC Chemicals & Packaging"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                <input
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 03001234567"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="supplier@example.com"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Factory / Warehouse Address</label>
                <input
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street / Industrial Area location"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Remarks</label>
                <textarea
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 h-24"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Payment terms, material types supplied..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl font-bold shadow-md">
                  {editingVendor ? 'Update Vendor' : 'Save Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Record Vendor Payment Modal ────────────────────────────────────── */}
      {isPaymentModalOpen && selectedVendorForPayment && canPayOrArchive && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Record Vendor Payment</h3>
                <p className="text-xs text-slate-500">Paying: {selectedVendorForPayment.name}</p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4 text-sm">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500 uppercase">Outstanding Payable Balance</span>
                <span className="text-base font-extrabold text-indigo-700">
                  Rs {Number(selectedVendorForPayment.payableBalance || 0).toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Amount (Rs) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 outline-none focus:border-emerald-500"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method *</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-medium outline-none focus:border-emerald-500"
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
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

              {/* Bank Payment Proof Upload */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bank Payment Proof (Receipt/Slip)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://... or upload proof slip"
                    value={paymentData.proofUrl}
                    onChange={(e) => setPaymentData({ ...paymentData, proofUrl: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-emerald-500"
                  />
                  <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold shrink-0 flex items-center gap-1">
                    {uploadingProof ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    Upload
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUploadPaymentProof} />
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500"
                  value={paymentData.remarks}
                  onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
                  placeholder="Payment notes..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white px-5 py-2 rounded-xl font-bold shadow-md flex items-center gap-2"
                >
                  {paymentSubmitting ? <><Loader2 size={16} className="animate-spin" /> Recording...</> : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Vendor Profile & Detailed Ledger Modal ────────────────────── */}
      {selectedVendorDetail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8 border border-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{selectedVendorDetail.name}</h3>
                <p className="text-xs text-slate-500">Contact: {selectedVendorDetail.phone} | {selectedVendorDetail.email || 'No email registered'}</p>
              </div>
              <button onClick={() => setSelectedVendorDetail(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={22} />
              </button>
            </div>

            {/* Overview Metric Cards */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-semibold block mb-1">Last Purchase Date</span>
                  <span className="text-sm font-bold text-slate-800 flex items-center gap-1">
                    <Calendar size={14} className="text-slate-400" />
                    {selectedVendorDetail.lastPurchaseDate 
                      ? new Date(selectedVendorDetail.lastPurchaseDate).toLocaleDateString()
                      : 'No purchases'}
                  </span>
                </div>

                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <span className="text-slate-500 font-semibold block mb-1">Total Purchases</span>
                  <span className="text-sm font-black text-blue-900">
                    Rs {Number(selectedVendorDetail.totalPurchases || 0).toLocaleString()}
                  </span>
                </div>

                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                  <span className="text-slate-500 font-semibold block mb-1">Total Paid</span>
                  <span className="text-sm font-black text-emerald-800">
                    Rs {Number(selectedVendorDetail.totalPaid || 0).toLocaleString()}
                  </span>
                </div>

                <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                  <span className="text-slate-500 font-semibold block mb-1">Payable Balance</span>
                  <span className="text-sm font-black text-purple-900">
                    Rs {Number(selectedVendorDetail.payableBalance || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Profile Tabs */}
              <div className="flex border-b border-slate-200 gap-2">
                <button
                  onClick={() => setProfileTab('ledger')}
                  className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 border-t border-x ${
                    profileTab === 'ledger'
                      ? 'bg-white border-slate-200 text-indigo-700 border-b-2 border-b-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <FileText size={14} /> Vendor Payable Registry (Ledger)
                </button>

                <button
                  onClick={() => setProfileTab('purchases')}
                  className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 border-t border-x ${
                    profileTab === 'purchases'
                      ? 'bg-white border-slate-200 text-blue-700 border-b-2 border-b-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <ShoppingCart size={14} /> Purchase History ({selectedVendorDetail.purchases?.length || 0})
                </button>

                <button
                  onClick={() => setProfileTab('payments')}
                  className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 border-t border-x ${
                    profileTab === 'payments'
                      ? 'bg-white border-slate-200 text-emerald-700 border-b-2 border-b-emerald-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Receipt size={14} /> Payment History ({selectedVendorDetail.payments?.length || 0})
                </button>
              </div>

              {/* TAB 1: VENDOR PAYABLE REGISTRY (LEDGER WITH RUNNING BALANCE) */}
              {profileTab === 'ledger' && (
                <div>
                  {selectedVendorDetail.ledgerEntries?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic p-4 text-center">No ledger activity recorded for this vendor.</p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Remarks / Reference</th>
                            <th className="p-3 text-right">Amount</th>
                            <th className="p-3 text-right">Running Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {selectedVendorDetail.ledgerEntries?.map(entry => (
                            <tr key={entry.id} className="hover:bg-slate-50/80">
                              <td className="p-3 text-slate-500">{new Date(entry.createdAt).toLocaleString()}</td>
                              <td className="p-3">
                                {entry.type === 'PURCHASE' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                                    PURCHASE (+)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                    PAYMENT (-)
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-slate-600">{entry.remarks || '—'}</td>
                              <td className={`p-3 text-right font-bold ${entry.type === 'PURCHASE' ? 'text-amber-700' : 'text-emerald-700'}`}>
                                Rs {Number(entry.amount).toLocaleString()}
                              </td>
                              <td className="p-3 text-right font-black text-indigo-900">
                                Rs {Number(entry.runningBalance || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PURCHASE HISTORY */}
              {profileTab === 'purchases' && (
                <div>
                  {selectedVendorDetail.purchases?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic p-4 text-center">No purchases recorded from this vendor.</p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="p-3">Invoice No</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Items Purchased</th>
                            <th className="p-3 text-right">Total Amount</th>
                            <th className="p-3 text-right">Receipt Proof</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {selectedVendorDetail.purchases?.map(pur => (
                            <tr key={pur.id} className="hover:bg-slate-50/80">
                              <td className="p-3 font-bold text-slate-800">{pur.invoiceNo || 'INV-MANUAL'}</td>
                              <td className="p-3 text-slate-500">{new Date(pur.createdAt).toLocaleDateString()}</td>
                              <td className="p-3 text-slate-700">
                                {pur.items?.map(i => `${i.item?.name || 'Material'} (${i.quantity})`).join(', ') || '—'}
                              </td>
                              <td className="p-3 text-right font-bold text-slate-900">
                                Rs {Number(pur.grandTotal || 0).toLocaleString()}
                              </td>
                              <td className="p-3 text-right">
                                {pur.receiptUrl ? (
                                  <a href={pur.receiptUrl} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold hover:underline">
                                    📷 View Receipt
                                  </a>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PAYMENT HISTORY */}
              {profileTab === 'payments' && (
                <div>
                  {selectedVendorDetail.payments?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic p-4 text-center">No payment transactions recorded for this vendor.</p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Method</th>
                            <th className="p-3">Reference #</th>
                            <th className="p-3">Remarks</th>
                            <th className="p-3 text-right">Amount</th>
                            <th className="p-3 text-right">Attached Bank Proof</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {selectedVendorDetail.payments?.map(pay => (
                            <tr key={pay.id} className="hover:bg-slate-50/80">
                              <td className="p-3 text-slate-500">{new Date(pay.createdAt).toLocaleDateString()}</td>
                              <td className="p-3 font-bold text-purple-800">{pay.paymentMethod || 'CASH'}</td>
                              <td className="p-3 text-slate-600">{pay.referenceNo || '—'}</td>
                              <td className="p-3 text-slate-600">{pay.remarks || '—'}</td>
                              <td className="p-3 text-right font-bold text-emerald-700">
                                Rs {Number(pay.amount).toLocaleString()}
                              </td>
                              <td className="p-3 text-right">
                                {pay.proofUrl ? (
                                  <a href={pay.proofUrl} target="_blank" rel="noreferrer" className="text-emerald-600 font-bold hover:underline">
                                    📷 View Bank Slip
                                  </a>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex justify-end shrink-0">
              <button onClick={() => setSelectedVendorDetail(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition">
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
