import { useState, useEffect, useRef } from 'react';
import { Plus, Printer } from 'lucide-react';
import { API_URL as API } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getCompanyFromCookie } from '../utils/companyCookie';
import { INVOICE_CONFIG, DEFAULT_DELIVERED_LOCATION } from '../constants/purchases';
import { toast } from 'sonner';
import { DeleteConfirmationModal } from '../components/ui';
import {
  PurchasesHeaderStats,
  PurchasesFilters,
  PurchasesTable,
  ViewPurchaseModal,
  AddEditPurchaseModal
} from '../components/purchases';

export default function Purchases() {
  const { user } = useAuth();
  const tenant = getCompanyFromCookie();
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Raw Material Purchases</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Record vendor procurement, shipment fulfillment, and payment credit status.</p>
        </div>
        {canAddPurchase && (
          <button
            onClick={handleOpenModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            <Plus size={18} className="stroke-[2.5]" /> <span>Record New Purchase</span>
          </button>
        )}
      </div>

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

      {/* Printable Voucher Modal */}
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
