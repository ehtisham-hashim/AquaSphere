import { useState, useEffect, useRef } from 'react';
import { API_URL as API } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { INVOICE_CONFIG, DEFAULT_DELIVERED_LOCATION } from '../constants/purchases';
import { toast } from 'sonner';
import { DeleteConfirmationModal } from '../components/ui';
import {
  PurchasesHeaderStats,
  PurchasesFilters,
  PurchasesTable,
  ViewPurchaseModal,
  AddEditPurchaseModal,
  PrintPurchaseModal
} from '../components/purchases';

export default function Purchases() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const isOwner = user?.role === 'OWNER';
  const isAccountant = user?.role === 'ACCOUNTANT';

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
        fetch(`${API}/purchases?${qParams.toString()}`, { headers: { 'x-tenant': tenant }, credentials: 'include' }),
        fetch(`${API}/vendors`, { headers: { 'x-tenant': tenant }, credentials: 'include' }),
        fetch(`${API}/items?type=RAW_MATERIAL`, { headers: { 'x-tenant': tenant }, credentials: 'include' })
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

  // ── Receipt Upload ────────────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFile(file);
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
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
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
      
      toast.success('Purchase Order Created! Raw Material Stock & Vendor Balance Updated.');
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
        headers: { 'x-tenant': tenant },
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
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant': tenant 
        },
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
        headers: { 'x-tenant': tenant },
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

  const totalCount = purchases.length;
  const totalAmount = purchases.reduce((acc, p) => acc + (Number(p.grandTotal) || 0), 0);
  const canAddPurchase = ['OWNER', 'PRODUCTION_MANAGER'].includes(user?.role);

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <PurchasesHeaderStats totalCount={totalCount} totalAmount={totalAmount} />

      {/* Filter Controls */}
      <PurchasesFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        onOpenModal={handleOpenModal}
        canAddPurchase={canAddPurchase}
      />

      {/* Main Table */}
      <PurchasesTable
        purchases={purchases}
        onView={setSelectedPurchase}
        onPrint={setPrintPurchase}
        onVerify={handleApprovePurchase}
        onDelete={setPurchaseToDelete}
        onStatusChange={handleQuickStatusChange}
        verifyingId={verifyingId}
        updatingStatusId={updatingStatusId}
        deletingId={deletingId}
        isOwner={isOwner}
        isAccountant={isAccountant}
        user={user}
        onOpenModal={handleOpenModal}
      />

      {/* Add / Edit Purchase Modal Component */}
      <AddEditPurchaseModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        error={error}
        submitting={submitting}
        vendorId={vendorId}
        setVendorId={setVendorId}
        invoiceNo={invoiceNo}
        setInvoiceNo={setInvoiceNo}
        deliveryChallanNo={deliveryChallanNo}
        setDeliveryChallanNo={setDeliveryChallanNo}
        purchaseDate={purchaseDate}
        setPurchaseDate={setPurchaseDate}
        deliveredTo={deliveredTo}
        setDeliveredTo={setDeliveredTo}
        status={status}
        setStatus={setStatus}
        paymentStatus={paymentStatus}
        setPaymentStatus={setPaymentStatus}
        remarks={remarks}
        setRemarks={setRemarks}
        items={items}
        setItems={setItems}
        vendors={vendors}
        materials={materials}
        user={user}
        fileInputRef={fileInputRef}
        handleFileSelect={handleFileSelect}
        uploading={uploading}
        uploadedReceiptUrl={uploadedReceiptUrl}
        receiptFile={receiptFile}
        uploadError={uploadError}
      />

      {/* View Purchase Voucher Modal Component */}
      <ViewPurchaseModal
        purchase={selectedPurchase}
        onClose={() => setSelectedPurchase(null)}
        onPrint={setPrintPurchase}
      />

      {/* Printable Voucher Modal Component */}
      <PrintPurchaseModal
        purchase={printPurchase}
        onClose={() => setPrintPurchase(null)}
      />

      {/* Delete Confirmation Modal */}
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
