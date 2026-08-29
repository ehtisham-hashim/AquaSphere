import { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getCompanyFromCookie } from '../utils/companyCookie';
import VendorTable from '../components/vendors/VendorTable';
import AddEditVendorModal from '../components/vendors/AddEditVendorModal';
import VendorPaymentModal from '../components/vendors/VendorPaymentModal';
import VendorDetailModal from '../components/vendors/VendorDetailModal';

export default function Vendors() {
  const { user } = useAuth();
  const tenant = getCompanyFromCookie();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

  const isPM = user?.role === 'PRODUCTION_MANAGER';
  const isOwnerOrAccountant = user?.role === 'OWNER' || user?.role === 'ACCOUNTANT';
  const canAddEdit = isOwnerOrAccountant || isPM;
  const canPayOrArchive = isOwnerOrAccountant;

  const [selectedVendorDetail, setSelectedVendorDetail] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedVendorForPayment, setSelectedVendorForPayment] = useState(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

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
        headers: { 'x-tenant': tenant },
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
  }, [includeArchived, tenant]);

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
    if (Number(v?.payableBalance || 0) <= 0) {
      toast.error(`Vendor ${v.name || 'selected'} has no outstanding payable balance`);
      return;
    }
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
    try {
      const res = await fetch(`${API_URL}/vendors/${v.id}`, {
        headers: { 'x-tenant': tenant },
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error('Vendor Name and Phone are required');
      return;
    }
    if (submitting) return;

    const url = editingVendor ? `${API_URL}/vendors/${editingVendor.id}` : `${API_URL}/vendors`;
    const method = editingVendor ? 'PUT' : 'POST';

    setSubmitting(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant': tenant 
        },
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
      toast.error(err.message || 'Failed to save vendor');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      toast.error('Please enter a valid payment amount greater than zero');
      return;
    }

    const maxPayable = Number(selectedVendorForPayment?.payableBalance || 0);
    if (maxPayable > 0 && parseFloat(paymentData.amount) > maxPayable + 0.01) {
      toast.error(`Payment amount cannot exceed outstanding balance of Rs. ${maxPayable.toLocaleString()}`);
      return;
    }

    const requiresProof = ['BANK_TRANSFER', 'CHEQUE', 'ONLINE_TRANSFER'].includes(paymentData.paymentMethod);
    if (requiresProof && !paymentData.proofUrl) {
      toast.error(`Payment proof is required for ${paymentData.paymentMethod.replace('_', ' ').toLowerCase()}`);
      return;
    }

    setPaymentSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/vendors/${selectedVendorForPayment.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant': tenant },
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

      {/* Vendor Table */}
      <VendorTable
        vendors={filteredVendors}
        loading={loading}
        canAddEdit={canAddEdit}
        canPayOrArchive={canPayOrArchive}
        onPay={handleOpenPayment}
        onView={handleViewDetails}
        onEdit={handleOpenEdit}
        onToggleArchive={handleToggleArchive}
      />

      {/* Add / Edit Vendor Modal */}
      <AddEditVendorModal
        isOpen={isModalOpen && canAddEdit}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        editingVendor={editingVendor}
        submitting={submitting}
      />

      {/* Record Vendor Payment Modal */}
      <VendorPaymentModal
        isOpen={isPaymentModalOpen && Boolean(selectedVendorForPayment) && canPayOrArchive}
        onClose={() => setIsPaymentModalOpen(false)}
        onSubmit={handlePaymentSubmit}
        selectedVendor={selectedVendorForPayment}
        paymentData={paymentData}
        setPaymentData={setPaymentData}
        paymentSubmitting={paymentSubmitting}
        tenant={tenant}
      />

      {/* View Vendor Profile Modal */}
      <VendorDetailModal
        selectedVendorDetail={selectedVendorDetail}
        onClose={() => setSelectedVendorDetail(null)}
        canPayOrArchive={canPayOrArchive}
        onOpenPayment={handleOpenPayment}
      />
    </div>
  );
}
