import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { 
  ArrowLeft, Phone, MapPin, Calendar, 
  FileText, ExternalLink, ShoppingBag, User, Edit3, Share2, MapPinIcon, Trash2, DollarSign,
  Droplets, Copy
} from 'lucide-react';
import { Badge, DeleteConfirmationModal } from '../ui';
import ImagePreviewModal from '../ui/ImagePreviewModal';
import EditCustomerModal from './EditCustomerModal';
import CustomerHistory from './CustomerHistory';
import CustomerAlerts from './CustomerAlerts';
import BottleAdjustmentModal from './BottleAdjustmentModal';
import SettleCustomerDebtModal from './SettleCustomerDebtModal';
import { API_URL as API } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { shareOrSendCustomerReceiptWhatsApp } from '../../utils/receiptFormatter';
import { openWhatsAppWeb } from '../../utils/whatsapp';

export default function CustomerDetails({ customer: initialCustomer, onClose, onCustomerUpdated, onCustomerDeleted, onViewOrder }) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [c, setC] = useState(initialCustomer);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBottleModalOpen, setIsBottleModalOpen] = useState(false);
  const [isPayDebtOpen, setIsPayDebtOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const isWadaana = tenant === 'wadaana';

  // Role permissions
  const userRole = (user?.role || '').toUpperCase();
  const isOwner = userRole === 'OWNER';
  const canEdit = ['OWNER', 'ADMIN', 'MARKETING_MANAGER'].includes(userRole);
  const canSettleDebt = ['OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'].includes(userRole);
  const canAdjustBottles = ['OWNER', 'ADMIN', 'PRODUCTION_MANAGER', 'MARKETING_MANAGER'].includes(userRole);
  const canDelete = isOwner;

  // Fetch full customer details with history
  useEffect(() => {
    const fetchCustomerDetails = async () => {
      if (!initialCustomer?.id) return;
      
      setIsLoading(true);
      try {
        const res = await fetch(`${API}/customers/${initialCustomer.id}`, {
          headers: { 'x-tenant': tenant },
          credentials: 'include'
        });
        const json = await res.json();
        if (json.success) {
          setC(json.data);
        }
      } catch (err) {
        console.error('Failed to load customer details:', err);
        setC(initialCustomer);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomerDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCustomer?.id, tenant]);

  const currentBalance = parseFloat(c?.currentBalance || 0);
  const isInactive30Days = c?.lastDeliveryAt && (new Date() - new Date(c.lastDeliveryAt)) > (30 * 24 * 60 * 60 * 1000);

  useEffect(() => {
    if (!c) return;
    if (isInactive30Days) {
      toast.warning('Inactivity Alert: No order repeat recorded for over 30 days.', { duration: 6000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.id, isInactive30Days, currentBalance]);

  if (!c) return null;

  const handleDelete = () => {
    setIsConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API}/customers/${c.id}`, {
        method: 'DELETE',
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Customer deleted successfully');
        setIsConfirmDeleteOpen(false);
        if (onCustomerDeleted) onCustomerDeleted(c.id);
        onClose();
      } else {
        toast.error(json.message || 'Failed to delete customer');
      }
    } catch {
      toast.error('Error deleting customer');
    } finally {
      setIsLoading(false);
    }
  };

  // Tenant-aware theme classes
  const theme = {
    primaryText: isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600',
    accentBg: isWadaana ? 'bg-sky-50' : 'bg-emerald-50',
    avatarBorder: isWadaana ? 'border-sky-200' : 'border-emerald-200',
    iconColor: isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600',
    badgeVariant: isWadaana ? 'sky' : 'emerald',
  };

  const lastOrderDate = c.lastDeliveryAt ? new Date(c.lastDeliveryAt).toLocaleDateString() : 'Never';

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden animate-in fade-in duration-200">
      
      {/* ======================================================== */}
      {/* ROW 1: COMMAND BAR (Identity + Quick Action Toolbar)    */}
      {/* ======================================================== */}
      <div className="px-5 sm:px-6 pt-4 pb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        {/* Left: Back Navigation, Avatar, Customer Name & Badges */}
        <div className="flex items-center gap-3.5 min-w-0 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors py-1.5 px-2 rounded-lg hover:bg-slate-100 -ml-2 shrink-0 cursor-pointer"
            title="Back to Customer Directory"
          >
            <ArrowLeft size={14} />
            <span>Customers</span>
          </button>

          <div className="h-5 w-px bg-slate-200 hidden sm:block shrink-0" />

          {/* Customer Avatar Frame with Pulse Indicator & Preview */}
          <div 
            className={`relative w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 ${c.homePictureUrl ? 'cursor-pointer hover:opacity-90' : ''}`}
            onClick={() => c.homePictureUrl && setPreviewImage(c.homePictureUrl)}
            title={c.homePictureUrl ? 'Click to view photo' : ''}
          >
            {c.homePictureUrl ? (
              <img 
                src={c.homePictureUrl} 
                alt={c.name} 
                className="w-full h-full object-cover"
                onError={(e) => { 
                  e.currentTarget.style.display = 'none'; 
                  if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex'; 
                }} 
              />
            ) : null}
            <User size={20} className={`text-slate-400 ${c.homePictureUrl ? 'hidden' : ''}`} />
            <div 
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white"
              title="Active Profile"
            />
          </div>

          {/* Customer Name, Code, Ref, and Type Badges */}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">{c.name}</h1>
            <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              {c.customerCode || `#${c.id.slice(0, 8).toUpperCase()}`}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
              c.marketerId && c.marketerId !== 'DIRECT'
                ? 'bg-slate-50 text-slate-700 border-slate-200'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              {c.marketerId && c.marketerId !== 'DIRECT' ? `Ref: ${c.marketerName || c.marketerRef || c.marketerId}` : 'Direct'}
            </span>
            <Badge variant={theme.badgeVariant} className="text-[10px]">{c.type || 'Standard'}</Badge>
          </div>
        </div>

        {/* Right: Restrained Quick Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          {/* Quick WhatsApp Statement Slip */}
          {c.phone && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await shareOrSendCustomerReceiptWhatsApp({ customer: c, isWadaana });
                  if (res?.method === 'web-share') {
                    toast.success('Customer receipt slip shared via WhatsApp!');
                  } else {
                    toast.success('Customer receipt copied! Press Ctrl+V in WhatsApp to send.', { duration: 6000 });
                  }
                } catch {
                  toast.error('Could not send receipt to WhatsApp.');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-medium text-xs transition shadow-2xs active:scale-95 cursor-pointer"
              title="Share Customer Statement via WhatsApp"
            >
              <Share2 size={13} className="text-slate-500" />
              <span className="hidden sm:inline">WhatsApp Slip</span>
            </button>
          )}

          {/* Bottle Adjustment button if allowed */}
          {canAdjustBottles && !isWadaana && (
            <button
              type="button"
              onClick={() => setIsBottleModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-medium text-xs transition shadow-2xs active:scale-95 cursor-pointer"
              title="Retrieve or Adjust Returnable Bottle Custody"
            >
              <Droplets size={13} className="text-slate-500" />
              <span className="hidden sm:inline">Bottles</span>
            </button>
          )}

          {/* Edit Customer Button */}
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-medium text-xs transition shadow-2xs active:scale-95 cursor-pointer"
              title="Edit Customer Profile"
            >
              <Edit3 size={13} className="text-slate-500" />
              <span>Edit</span>
            </button>
          )}

          {/* Primary CTA: Pay Debt (if debt exists and permitted) */}
          {canSettleDebt && currentBalance > 0 && (
            <button
              type="button"
              onClick={() => setIsPayDebtOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition shadow-2xs active:scale-95 cursor-pointer"
              title="Settle Outstanding Debt with FIFO Allocation"
            >
              <DollarSign size={13} />
              <span>Pay Debt</span>
            </button>
          )}

          {/* Delete Button (Owner Only) */}
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="p-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg transition shadow-2xs active:scale-95 cursor-pointer"
              title="Delete Customer (Owner Only)"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* ROW 2: CONTEXT & METADATA STRIP (Dedicated breathing room)*/}
      {/* ======================================================== */}
      <div className="px-5 sm:px-6 py-2.5 bg-slate-50/70 border-t border-b border-slate-100 flex items-center gap-4 flex-wrap text-xs text-slate-600">
        {c.phone && (
          <div className="flex items-center gap-1.5">
            <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 text-slate-700 hover:text-brand font-mono font-medium">
              <Phone size={12} className="text-slate-400" />
              <span>{c.phone}</span>
            </a>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(c.phone);
                toast.success('Phone copied!');
              }}
              className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
              title="Copy phone"
            >
              <Copy size={11} />
            </button>
            <button
              type="button"
              onClick={() => openWhatsAppWeb(c.phone, '')}
              className="text-slate-400 hover:text-emerald-600 p-0.5 cursor-pointer"
              title="Chat on WhatsApp"
            >
              <Share2 size={11} />
            </button>
          </div>
        )}

        {c.address && (
          <div className="flex items-center gap-1 text-slate-600 max-w-md truncate" title={c.address}>
            <MapPin size={12} className="text-slate-400 shrink-0" />
            <span className="truncate">{c.address}</span>
            {c.mapLink && (
              <a
                href={c.mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline inline-flex items-center shrink-0 ml-0.5"
                title="View on Google Maps"
              >
                <ExternalLink size={11} />
              </a>
            )}
          </div>
        )}

        {(c.buyerNtn || c.buyerStrn) && (
          <span className="text-[11px] font-mono text-slate-400 border-l border-slate-200 pl-3">
            {c.buyerNtn ? `NTN: ${c.buyerNtn}` : `STRN: ${c.buyerStrn}`}
          </span>
        )}
      </div>

      {/* ======================================================== */}
      {/* ROW 3: FINANCIAL & CUSTODY KPI METRICS STRIP             */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-white border-b border-slate-100 px-5 sm:px-6 py-3.5">
        {/* Col 1: Current Debt */}
        <div className="py-2 sm:py-0 sm:pr-4 flex flex-col justify-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Current Debt</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className={`text-base sm:text-lg font-bold font-mono tabular-nums ${currentBalance > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              Rs. {currentBalance.toLocaleString()}
            </span>
            {canSettleDebt && currentBalance > 0 && (
              <button
                type="button"
                onClick={() => setIsPayDebtOpen(true)}
                className="text-xs font-semibold text-brand hover:underline cursor-pointer"
              >
                Settle
              </button>
            )}
          </div>
        </div>

        {/* Col 2: Security Deposit */}
        <div className="py-2 sm:py-0 sm:px-4 flex flex-col justify-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Security Deposit</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-base sm:text-lg font-bold font-mono text-slate-800 tabular-nums">
              Rs. {(c.deposit || 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">Refundable</span>
          </div>
        </div>

        {/* Col 3: Custody / Terms */}
        <div className="py-2 sm:py-0 sm:px-4 flex flex-col justify-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            {!isWadaana ? 'Bottle Custody' : 'Credit Terms'}
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-base sm:text-lg font-bold font-mono text-slate-800 tabular-nums">
              {!isWadaana ? `${c.cachedBottleBalance || 0} btl` : `${c.creditDuration || 1} Days`}
            </span>
            {!isWadaana && canAdjustBottles && (
              <button
                type="button"
                onClick={() => setIsBottleModalOpen(true)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
              >
                Adjust
              </button>
            )}
          </div>
        </div>

        {/* Col 4: Total Orders & Activity */}
        <div className="py-2 sm:py-0 sm:pl-4 flex flex-col justify-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Orders</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-base sm:text-lg font-bold font-mono text-slate-800 tabular-nums">
              {(c.orders || []).length}
            </span>
            <span className="text-xs text-slate-400 truncate">
              Last: {lastOrderDate}
            </span>
          </div>
        </div>
      </div>

      {/* High-Visibility Consolidated Alert Banner (renders null if no critical risks) */}
      <CustomerAlerts customer={c} />

      {/* Full-Width Workspace with Single-Tier Underline Tabs */}
      <CustomerHistory
        customer={c}
        isWadaana={isWadaana}
        onViewOrder={onViewOrder}
        isLoading={isLoading}
      />

      {/* Bottle Adjustment / Retrieval Modal */}
      {isBottleModalOpen && (
        <BottleAdjustmentModal
          customer={c}
          onClose={() => setIsBottleModalOpen(false)}
          onSuccess={() => {
            fetch(`${API}/customers/${c.id}`, {
              headers: { 'x-tenant': tenant },
              credentials: 'include'
            })
              .then(res => res.json())
              .then(json => {
                if (json.success) {
                  setC(json.data);
                  if (onCustomerUpdated) onCustomerUpdated(json.data);
                }
              });
          }}
        />
      )}

      <EditCustomerModal
        isOpen={isEditOpen}
        customer={c}
        onClose={() => setIsEditOpen(false)}
        onCustomerUpdated={(updated) => {
          setC(updated);
          toast.success('Customer information updated');
          if (onCustomerUpdated) onCustomerUpdated(updated);
        }}
      />

      {previewImage && (
        <ImagePreviewModal
          src={previewImage}
          alt={c.name}
          onClose={() => setPreviewImage(null)}
        />
      )}

      {isPayDebtOpen && (
        <SettleCustomerDebtModal
          customer={c}
          onClose={() => setIsPayDebtOpen(false)}
          onSuccess={() => {
            setIsPayDebtOpen(false);
            fetch(`${API}/customers/${c.id}`, {
              headers: { 'x-tenant': tenant },
              credentials: 'include'
            })
              .then(res => res.json())
              .then(json => {
                if (json.success) {
                  setC(json.data);
                  if (onCustomerUpdated) onCustomerUpdated(json.data);
                }
              })
              .catch(err => console.error('Error refreshing customer details after payment', err));
          }}
        />
      )}

      <DeleteConfirmationModal
        isOpen={isConfirmDeleteOpen}
        title={`Delete Customer: ${c?.name || ''}`}
        message={`Are you sure you want to delete ${c?.name}? This action cannot be undone.`}
        confirmText="Delete Customer"
        variant="danger"
        loading={isLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => setIsConfirmDeleteOpen(false)}
      />
    </div>
  );
}
