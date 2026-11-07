import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL as API } from '../utils/api';
import { peekCachedData } from '../utils/apiCache';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { useLiveEvent } from '../context/SSEContext';
import { toast } from 'sonner';
import { DeleteConfirmationModal, PageHeader } from '../components/ui';
import {
  PurchasesHeaderStats,
  PurchasesFilters,
  PurchasesTable,
  ViewPurchaseModal,
  AddEditPurchaseModal,
  RecordPurchasePaymentModal
} from '../components/purchases';

export default function Purchases() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  
  // Role-based access control
  const isOwner = user?.role === 'OWNER';
  const isAccountant = user?.role === 'ACCOUNTANT';
  const canAddPurchase = ['OWNER', 'ACCOUNTANT', 'ADMIN'].includes(user?.role);

  const [purchases, setPurchases] = useState(() => {
    const cached = peekCachedData(`${API}/purchases`, { headers: { 'x-tenant': tenant } });
    return (cached?.success && Array.isArray(cached.data)) ? cached.data : [];
  });
  const [vendors, setVendors] = useState(() => {
    const cached = peekCachedData(`${API}/vendors`, { headers: { 'x-tenant': tenant } });
    return (cached?.success && Array.isArray(cached.data)) ? cached.data.filter(v => !v.archivedAt) : [];
  });
  const [materials, setMaterials] = useState(() => {
    const cached = peekCachedData(`${API}/items?type=RAW_MATERIAL`, { headers: { 'x-tenant': tenant } });
    return (cached?.success && Array.isArray(cached.data)) ? cached.data.filter(m => !m.archivedAt) : [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = peekCachedData(`${API}/purchases`, { headers: { 'x-tenant': tenant } });
    return !(cached?.success && Array.isArray(cached.data));
  });
  const hasLoadedRef = useRef(!loading);

  // Modal & Selected state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [purchaseToDelete, setPurchaseToDelete] = useState(null);
  const [purchaseForPayment, setPurchaseForPayment] = useState(null);

  // Loading indicators
  const [deletingId, setDeletingId] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL');

  // Fetch static catalogs once on mount / tenant change
  const fetchCatalogs = useCallback(async () => {
    try {
      const [vendorsRes, materialsRes] = await Promise.all([
        fetch(`${API}/vendors`, { headers: { 'x-tenant': tenant }, credentials: 'include' }),
        fetch(`${API}/items?type=RAW_MATERIAL`, { headers: { 'x-tenant': tenant }, credentials: 'include' })
      ]);
      const vData = await vendorsRes.json();
      const mData = await materialsRes.json();
      if (vData.success && Array.isArray(vData.data)) setVendors(vData.data.filter(v => !v.archivedAt));
      if (mData.success && Array.isArray(mData.data)) setMaterials(mData.data.filter(m => !m.archivedAt));
    } catch (err) {
      console.error('Error fetching vendors/materials:', err);
    }
  }, [tenant]);

  // Fetch purchases list with search & date filters
  const fetchPurchases = useCallback(async (isBackground = false) => {
    if (!isBackground && !hasLoadedRef.current) setLoading(true);
    try {
      const qParams = new URLSearchParams();
      if (searchQuery.trim()) qParams.append('search', searchQuery.trim());
      if (dateFilter && dateFilter !== 'ALL') qParams.append('dateFilter', dateFilter);

      const qs = qParams.toString();
      const url = qs ? `${API}/purchases?${qs}` : `${API}/purchases`;
      const res = await fetch(url, {
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPurchases(data.data);
      }
    } catch (err) {
      console.error('Error fetching purchase data:', err);
    } finally {
      setLoading(false);
      hasLoadedRef.current = true;
    }
  }, [tenant, searchQuery, dateFilter]);

  useEffect(() => {
    fetchCatalogs();
  }, [fetchCatalogs]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  useLiveEvent(['PURCHASE_CREATED', 'INVENTORY_CHANGED'], () => {
    fetchPurchases(true);
    fetchCatalogs();
  });

  // Handlers
  const handleOpenAddModal = () => {
    setEditingPurchase(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (purchase) => {
    setEditingPurchase(purchase);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPurchase(null);
  };

  const handleApprovePurchase = async (pId) => {
    setVerifyingId(pId);
    try {
      const res = await fetch(`${API}/purchases/${pId}/approve`, {
        method: 'POST',
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Purchase verified successfully');
        fetchPurchases();
        if (selectedPurchase?.id === pId) {
          setSelectedPurchase(json.data);
        }
      } else {
        toast.error(json.message || 'Failed to verify purchase');
      }
    } catch (err) {
      console.error('Error approving purchase:', err);
      toast.error('Error approving purchase');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleConfirmDeletePurchase = async () => {
    if (!purchaseToDelete) return;
    const pId = purchaseToDelete.id;
    setDeletingId(pId);
    try {
      const res = await fetch(`${API}/purchases/${pId}`, {
        method: 'DELETE',
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Purchase deleted and inventory reversed successfully');
        setPurchaseToDelete(null);
        fetchPurchases();
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

  const totalCount = purchases.length;
  const totalAmount = purchases.reduce((acc, p) => acc + (Number(p.grandTotal) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Vendor Purchases"
        actions={
          canAddPurchase && (
            <button
              onClick={handleOpenAddModal}
              className="btn-primary"
            >
              <span>+ Record Purchase</span>
            </button>
          )
        }
      />

      {/* Stats Summary */}
      <PurchasesHeaderStats totalCount={totalCount} totalAmount={totalAmount} />

      {/* Filter Controls */}
      <PurchasesFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
      />

      {/* Main Table */}
      <PurchasesTable
        purchases={purchases}
        loading={loading}
        onView={setSelectedPurchase}
        onPrint={setSelectedPurchase}
        onEdit={handleOpenEditModal}
        onVerify={handleApprovePurchase}
        onDelete={setPurchaseToDelete}
        onRecordPayment={setPurchaseForPayment}
        verifyingId={verifyingId}
        deletingId={deletingId}
        isOwner={isOwner}
        isAccountant={isAccountant}
        user={user}
        onOpenModal={handleOpenAddModal}
      />

      {/* Add / Edit Purchase Modal */}
      <AddEditPurchaseModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={fetchPurchases}
        initialData={editingPurchase}
        vendors={vendors}
        materials={materials}
        user={user}
        tenant={tenant}
      />

      {/* View Purchase Voucher Modal */}
      <ViewPurchaseModal
        purchase={selectedPurchase}
        onClose={() => setSelectedPurchase(null)}
        onRecordPayment={setPurchaseForPayment}
      />

      {/* Record Purchase Payment Modal */}
      {purchaseForPayment && (
        <RecordPurchasePaymentModal
          purchase={purchaseForPayment}
          onClose={() => setPurchaseForPayment(null)}
          onSuccess={() => {
            fetchPurchases();
            if (selectedPurchase?.id === purchaseForPayment?.id) {
              setSelectedPurchase(null);
            }
          }}
        />
      )}

      {/* Delete Confirmation Modal (Owner Only) */}
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
