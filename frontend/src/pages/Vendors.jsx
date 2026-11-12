import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '../utils/api';
import { peekCachedData } from '../utils/apiCache';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { useLiveEvent } from '../context/SSEContext';
import VendorTable from '../components/vendors/VendorTable';
import AddEditVendorModal from '../components/vendors/AddEditVendorModal';
import VendorDetailModal from '../components/vendors/VendorDetailModal';
import VendorPaymentModal from '../components/vendors/VendorPaymentModal';
import { PageHeader, DeleteConfirmationModal } from '../components/ui';

export default function Vendors() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [vendors, setVendors] = useState(() => {
    const cached = peekCachedData(`${API_URL}/vendors?includeArchived=false`, { headers: { 'x-tenant': tenant } });
    return (cached?.success && Array.isArray(cached.data)) ? cached.data : [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = peekCachedData(`${API_URL}/vendors?includeArchived=false`, { headers: { 'x-tenant': tenant } });
    return !(cached?.success && Array.isArray(cached.data));
  });
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [vendorToDelete, setVendorToDelete] = useState(null);
  const [vendorToArchive, setVendorToArchive] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [vendorToPay, setVendorToPay] = useState(null);

  const isOwner = user?.role === 'OWNER';
  const isOwnerOrAccountant = isOwner || user?.role === 'ACCOUNTANT';
  const isAdmin = user?.role === 'ADMIN';
  const canAddEdit = isOwnerOrAccountant || isAdmin;
  const canPayOrArchive = isOwnerOrAccountant || isAdmin;

  const [selectedVendorDetail, setSelectedVendorDetail] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  const hasLoadedRef = useRef(!loading);

  const fetchVendors = useCallback(async (isBackground = false) => {
    if (!isBackground && !hasLoadedRef.current) {
      setLoading(true);
    }
    try {
      const res = await fetch(`${API_URL}/vendors?includeArchived=${includeArchived}`, {
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      let json = {};
      try {
        json = await res.json();
      } catch {
        // Fallback for non-JSON response
      }
      if (res.ok && json.success) setVendors(json.data || []);
      else toast.error(json.message || 'Failed to load vendors');
    } catch (err) {
      console.error(err);
      toast.error('Failed to load vendors');
    } finally {
      hasLoadedRef.current = true;
      if (!isBackground) setLoading(false);
    }
  }, [includeArchived, tenant]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  useLiveEvent(['PURCHASE_CREATED', 'EXPENSE_LOGGED', 'VENDOR_UPDATED'], () => fetchVendors(true));

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
    setVendorToPay(v);
    setIsPaymentModalOpen(true);
  };

  const handleViewDetails = async (v) => {
    try {
      const res = await fetch(`${API_URL}/vendors/${v.id}`, {
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      let json = {};
      try {
        json = await res.json();
      } catch {
        // Fallback for non-JSON response
      }
      if (res.ok && json.success) {
        setSelectedVendorDetail(json.data);
      } else {
        toast.error(json.message || 'Failed to load vendor profile');
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
      let json = {};
      try {
        json = await res.json();
      } catch {
        // Fallback for non-JSON response
      }
      if (!res.ok || !json.success) {
        toast.error(json.message || `Failed to ${editingVendor ? 'update' : 'create'} vendor (Status: ${res.status})`);
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

  const handleToggleArchive = (v) => {
    setVendorToArchive(v);
  };

  const handleConfirmToggleArchiveVendor = async () => {
    if (!vendorToArchive) return;
    const isArchived = !!vendorToArchive.archivedAt;
    const action = isArchived ? 'restore' : 'archive';

    setIsArchiving(true);
    try {
      const res = await fetch(`${API_URL}/vendors/${vendorToArchive.id}/${action}`, {
        method: 'PATCH',
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      let json = {};
      try {
        json = await res.json();
      } catch {
        // Fallback for non-JSON response
      }
      if (res.ok && json.success) {
        toast.success(`Vendor ${action}d successfully`);
        setVendorToArchive(null);
        fetchVendors();
      } else {
        toast.error(json.message || `Failed to ${action} vendor`);
      }
    } catch (err) {
      toast.error(`Failed to ${action} vendor`);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleConfirmDeleteVendor = async () => {
    if (!vendorToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/vendors/${vendorToDelete.id}`, {
        method: 'DELETE',
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Vendor "${vendorToDelete.name}" deleted successfully`);
        setVendorToDelete(null);
        if (selectedVendorDetail?.id === vendorToDelete.id) {
          setSelectedVendorDetail(null);
        }
        fetchVendors();
      } else {
        toast.error(data.message || 'Failed to delete vendor');
      }
    } catch (err) {
      console.error('Failed to delete vendor:', err);
      toast.error('Failed to delete vendor');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.phone && v.phone.includes(search))
  );

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Vendors Directory"
        actions={
          canAddEdit && (
            <button
              onClick={handleOpenAdd}
              className="btn-primary"
            >
              <Plus size={14} />
              <span>Add Vendor</span>
            </button>
          )
        }
      />

      {/* Action Header & Filter */}
      <div className="card-surface p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="search"
            placeholder="Search vendor by name or phone..."
            className="input-base pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="rounded border-slate-300 text-brand focus:ring-brand h-3.5 w-3.5 cursor-pointer"
            />
            <span>Show Archived</span>
          </label>
        </div>
      </div>

      {/* Vendor Table */}
      <VendorTable
        vendors={filteredVendors}
        loading={loading}
        canAddEdit={canAddEdit}
        canPayOrArchive={canPayOrArchive}
        onView={handleViewDetails}
        onPay={handleOpenPayment}
        onEdit={handleOpenEdit}
        onToggleArchive={handleToggleArchive}
        onDeleteVendor={setVendorToDelete}
        isOwner={isOwner}
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

      {/* View Vendor Profile Modal */}
      <VendorDetailModal
        selectedVendorDetail={selectedVendorDetail}
        onClose={() => setSelectedVendorDetail(null)}
        canPayOrArchive={canPayOrArchive}
        onPay={handleOpenPayment}
        onDeleteVendor={setVendorToDelete}
        isOwner={isOwner}
      />

      {/* Vendor Lump-Sum Pooled Payment Modal */}
      <VendorPaymentModal
        isOpen={isPaymentModalOpen && canPayOrArchive}
        vendor={vendorToPay}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setVendorToPay(null);
        }}
        onSuccess={() => {
          fetchVendors();
          if (selectedVendorDetail && vendorToPay && selectedVendorDetail.id === vendorToPay.id) {
            handleViewDetails(vendorToPay);
          }
        }}
      />

      <DeleteConfirmationModal
        isOpen={!!vendorToDelete}
        onClose={() => setVendorToDelete(null)}
        onConfirm={handleConfirmDeleteVendor}
        loading={isDeleting}
        title="Delete Vendor"
        message={`Are you sure you want to permanently delete vendor "${vendorToDelete?.name}"? All associated purchases, ledger entries, and vendor payments will be permanently removed, and inventory increments will be reversed.`}
        confirmText="Delete Vendor"
      />

      <DeleteConfirmationModal
        isOpen={!!vendorToArchive}
        onClose={() => setVendorToArchive(null)}
        onConfirm={handleConfirmToggleArchiveVendor}
        loading={isArchiving}
        title={`${vendorToArchive?.archivedAt ? 'Restore' : 'Archive'} Vendor`}
        message={`Are you sure you want to ${vendorToArchive?.archivedAt ? 'restore' : 'archive'} vendor "${vendorToArchive?.name}"?`}
        confirmText={vendorToArchive?.archivedAt ? 'Restore Vendor' : 'Archive Vendor'}
        variant={vendorToArchive?.archivedAt ? 'primary' : 'danger'}
      />
    </div>
  );
}
