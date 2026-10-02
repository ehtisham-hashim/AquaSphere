import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { 
  X, Phone, MapPin, Calendar, 
  FileText, ExternalLink, ShoppingBag, User, Edit3, Share2, MapPinIcon, Trash2
} from 'lucide-react';
import { Badge } from '../ui';
import ImagePreviewModal from '../ui/ImagePreviewModal';
import EditCustomerModal from './EditCustomerModal';
import CustomerHistory from './CustomerHistory';
import CustomerAlerts from './CustomerAlerts';
import BottleAdjustmentModal from './BottleAdjustmentModal';
import { API_URL as API } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { openWhatsAppWeb, WhatsAppTemplates } from '../../utils/whatsapp';

// ponytail: two-column flat layout eliminates container fatigue; circular avatar frame and high-contrast action toolbar
export default function CustomerDetails({ customer: initialCustomer, onClose, onCustomerUpdated, onCustomerDeleted }) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [c, setC] = useState(initialCustomer);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBottleModalOpen, setIsBottleModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const isWadaana = tenant === 'wadaana';

  // Role permissions:
  // OWNER side has: Edit, Delete, and Close/Cancel
  // Other sides (PM, MM, ADMIN, ACCOUNTANT, etc.): Edit and Close/Cancel, but strictly NO Delete
  const userRole = (user?.role || '').toUpperCase();
  const isOwner = userRole === 'OWNER';
  const canDelete = isOwner;
  const canEdit = isOwner || ['MARKETING_MANAGER', 'PRODUCTION_MANAGER', 'ADMIN', 'ACCOUNTANT', 'TRANSPORT_MANAGER', 'MM', 'PM'].includes(userRole) || Boolean(user);

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
  const limitVal = parseFloat(c?.creditLimit || 0);
  const isOverLimit = currentBalance > limitVal; 
  const isInactive30Days = c?.lastDeliveryAt && (new Date() - new Date(c.lastDeliveryAt)) > (30 * 24 * 60 * 60 * 1000);

  useEffect(() => {
    if (!c) return;
    if (isOverLimit) {
      toast.error(`Credit Warning: Debt (Rs. ${currentBalance.toLocaleString()}) exceeds limit.`, { duration: 6000 });
    }
    if (isInactive30Days) {
      toast.warning('Inactivity Alert: No order repeat recorded for over 30 days.', { duration: 6000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.id, isOverLimit, isInactive30Days, currentBalance]);

  if (!c) return null;

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${c.name}? This action cannot be undone.`)) return;
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
        if (onCustomerDeleted) onCustomerDeleted(c.id);
        onClose();
      } else {
        toast.error(json.message || 'Failed to delete customer');
      }
    } catch (err) {
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
      
      {/* Left Column: Profile Card & Image Placeholder */}
      <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
        
        {/* Profile Image - Elegant Circular Frame */}
        <div className="relative group mb-4">
          {/* Circular Frame Outer Gradient Border */}
          <div
            className={`w-36 h-36 rounded-full p-1 bg-gradient-to-tr ${
              isWadaana 
                ? 'from-sky-400 via-blue-500 to-indigo-500 shadow-sky-500/20 ring-sky-100/70' 
                : 'from-emerald-400 via-teal-500 to-cyan-500 shadow-emerald-500/20 ring-emerald-100/70'
            } shadow-lg ring-4 transition-all duration-300 group-hover:scale-105`}
          >
            {/* Inner White Ring */}
            <div className="w-full h-full rounded-full bg-white p-1 overflow-hidden flex items-center justify-center">
              <div
                className={`w-full h-full rounded-full ${theme.accentBg} flex items-center justify-center overflow-hidden relative ${c.homePictureUrl ? 'cursor-pointer' : ''}`}
                onClick={() => c.homePictureUrl && setPreviewImage(c.homePictureUrl)}
                title={c.homePictureUrl ? 'Click to view full image' : ''}
              >
                {c.homePictureUrl ? (
                  <>
                    <img 
                      src={c.homePictureUrl} 
                      alt={c.name} 
                      className="w-full h-full object-cover rounded-full transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => { 
                        e.currentTarget.style.display = 'none'; 
                        if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex'; 
                      }} 
                    />
                    <div className="hidden w-full h-full items-center justify-center">
                      <User size={56} className={`${theme.iconColor} opacity-75`} />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <User size={56} className={`${theme.iconColor} opacity-75`} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active status indicator badge */}
          <div 
            className="absolute bottom-1 right-2 w-6 h-6 rounded-full bg-emerald-500 text-white border-2 border-white flex items-center justify-center shadow-md text-xs font-bold"
            title="Active Customer Profile"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          </div>
        </div>

        {/* Name & Badges */}
        <h1 className="text-xl font-bold text-slate-900">{c.name}</h1>
        <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
          <Badge variant={theme.badgeVariant}>{c.type || 'Standard'}</Badge>
          <Badge variant="slate" className="uppercase text-[10px]">{isWadaana ? 'Wadaana Ind.' : 'AquaSphere'}</Badge>
        </div>

        {/* Contact Info List */}
        <div className="w-full border-t border-slate-100 mt-6 pt-6 space-y-4 text-left text-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <Phone size={16} className="text-slate-400 flex-shrink-0" />
            <span className="font-semibold flex-1">{c.phone || 'No phone provided'}</span>
            {c.phone && (() => {
              const buildText = () => {
                return [
                  `📋 *Customer Details*`,
                  `👤 Name: ${c.name}`,
                  `📞 Phone: ${c.phone}`,
                  c.address ? `📍 Address: ${c.address}` : null,
                  c.homePictureUrl ? `🖼️ Photo: ${c.homePictureUrl}` : null,
                ].filter(Boolean).join('\n');
              };

              return (
                <>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(buildText());
                      toast.success('Customer details copied to clipboard!');
                    }}
                    className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex-shrink-0"
                    title="Copy customer details"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                  <button
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(buildText())}`, '_blank')}
                    className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors flex-shrink-0"
                    title="Share customer details via WhatsApp"
                  >
                    <Share2 size={18} />
                  </button>
                </>
              );
            })()}
          </div>
          <div className="flex items-start gap-3 text-slate-600">
            <MapPin size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{c.address || 'No physical address provided.'}</span>
          </div>
          {c.mapLink && (
            <div className="flex items-center gap-2 pt-2">
              <a
                href={c.mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 font-bold ${theme.primaryText} hover:underline text-xs`}
              >
                <span>View on Google Maps</span>
                <ExternalLink size={14} />
              </a>
              <a
                href={c.mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isWadaana ? 'bg-sky-100 text-[#0ea5e9] hover:bg-sky-200' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'} transition-colors flex items-center gap-1`}
                title="Open location in maps"
              >
                <MapPinIcon size={14} />
                Open Location
              </a>
            </div>
          )}
          {c.createdAt && (
            <div className="pt-2 text-slate-400 text-xs flex items-center gap-2">
              <Calendar size={14} className="flex-shrink-0" />
              <span>Member Since: {new Date(c.createdAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Unified Details & Financial Overview */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
        <div className="space-y-6">
          
          {/* Header & Polished Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Customer Overview</h2>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  Profile Details
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">Complete financial, credit, and product profiles</p>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Edit Customer Button - Accessible to OWNER, PM, MM, ADMIN, etc. */}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsEditOpen(true)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-xs sm:text-sm tracking-wide shadow-sm transition-all duration-200 active:scale-95 ${
                    isWadaana 
                      ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-sky-500/25 hover:shadow-md hover:shadow-sky-500/35' 
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/25 hover:shadow-md hover:shadow-emerald-600/35'
                  }`}
                  title="Edit Customer Details"
                >
                  <Edit3 size={15} className="text-white/90" />
                  <span>Edit Customer</span>
                </button>
              )}

              {/* Delete Button - Strictly OWNER ONLY */}
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100/90 text-rose-600 hover:text-rose-700 border border-rose-200/80 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 shadow-sm hover:shadow active:scale-95 group"
                  title="Delete Customer (Owner Only)"
                >
                  <Trash2 size={15} className="text-rose-500 group-hover:text-rose-700 transition-colors" />
                  <span>Delete</span>
                </button>
              )}

              {/* Close Button - For all roles */}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/90 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 shadow-sm hover:shadow active:scale-95 group"
                title="Close Overview"
              >
                <span>Close</span>
                <X size={15} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
              </button>
            </div>
          </div>

          {/* Inline Financial & Custody Metrics Banner (No Box Fatigue) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center divide-y md:divide-y-0 md:divide-x divide-slate-200">
              
              <div className="p-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Current Debt</span>
                <span className={`text-lg font-bold font-mono block mt-1 ${isOverLimit ? 'text-rose-600' : (currentBalance > 0 ? 'text-amber-600' : 'text-slate-800')}`}>
                  Rs. {currentBalance.toLocaleString()}
                </span>
                <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">
                  {limitVal > 0 ? `Limit: Rs. ${limitVal.toLocaleString()}` : 'No Limit'}
                </span>
                {currentBalance > 0 && c.phone && (
                  <button
                    type="button"
                    onClick={() => {
                      const msg = WhatsAppTemplates.overdueBillReminder(c, isWadaana);
                      openWhatsAppWeb(c.phone, msg);
                    }}
                    className="mt-1.5 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold inline-flex items-center gap-1 transition-colors"
                    title="Send Overdue Bill Reminder via WhatsApp"
                  >
                    <Share2 size={10} />
                    <span>WhatsApp Reminder</span>
                  </button>
                )}
              </div>

              <div className="p-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Security Deposit</span>
                <span className="text-lg font-bold font-mono text-slate-800 block mt-1">
                  Rs. {(c.deposit || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Refundable deposit
                </span>
              </div>

              <div className="p-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  {!isWadaana ? '19L Bottle Custody' : 'Credit Terms'}
                </span>
                <span className="text-lg font-bold font-mono text-slate-800 block mt-1">
                  {!isWadaana ? `${c.cachedBottleBalance || 0} Empty` : `${c.creditDuration || 1} Days`}
                </span>
                {!isWadaana ? (
                  (c.cachedBottleBalance || 0) > 0 && (
                    <button
                      onClick={() => setIsBottleModalOpen(true)}
                      className="text-[11px] font-bold text-amber-700 hover:text-amber-800 underline mt-0.5 block mx-auto"
                    >
                      Retrieve / Adjust
                    </button>
                  )
                ) : (
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Allowed credit span
                  </span>
                )}
              </div>

              <div className="p-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Last Activity</span>
                <span className="text-lg font-bold text-slate-800 block mt-1 truncate">{lastOrderDate}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {!isWadaana ? `${c.creditDuration || 1} Days Credit` : 'Order history'}
                </span>
              </div>
            </div>
          </div>

          {/* Purchasing Preferences Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag size={16} className={theme.iconColor} />
                <span>Purchased Products ({isWadaana ? 'Wadaana Preforms' : 'AquaSphere Delivery'})</span>
              </h3>
              {Number(c.defaultPrice || 0) > 0 && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-mono">
                  Custom Rate: Rs. {Number(c.defaultPrice).toLocaleString()}
                </span>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              {!isWadaana ? (
                <div className="flex flex-wrap gap-2 items-center">
                  {c.buys19L && <Badge variant="blue" className="text-sm px-3 py-1">19L Refill Bottles</Badge>}
                  {c.buys05LPet && <Badge variant="emerald" className="text-sm px-3 py-1">0.5L PET Bottles</Badge>}
                  {c.buys15LPet && <Badge variant="amber" className="text-sm px-3 py-1">1.5L PET Bottles</Badge>}
                  {!c.buys19L && !c.buys05LPet && !c.buys15LPet && (
                    <span className="text-slate-400 text-sm italic">No active product types recorded for this customer.</span>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-sky-700 block mb-1.5">Pure Preform Bottles</span>
                    <div className="flex flex-wrap gap-2">
                      {c.buysPure05L && <Badge variant="cyan" className="text-sm px-3 py-1">0.5L Pure Bottle (15g)</Badge>}
                      {c.buysPure15L && <Badge variant="sky" className="text-sm px-3 py-1">1.5L Pure Bottle (30g)</Badge>}
                      {!c.buysPure05L && !c.buysPure15L && <span className="text-slate-400 text-xs">No pure preforms selected</span>}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-xs font-bold text-amber-700 block mb-1.5">Mix Preform Bottles</span>
                    <div className="flex flex-wrap gap-2">
                      {c.buysMix05L && <Badge variant="amber" className="text-sm px-3 py-1">0.5L Mix Bottle (13g)</Badge>}
                      {c.buysMix15L && <Badge variant="orange" className="text-sm px-3 py-1">1.5L Mix Bottle (27g)</Badge>}
                      {!c.buysMix05L && !c.buysMix15L && <span className="text-slate-400 text-xs">No mix preforms selected</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Remarks Section */}
          <div className="space-y-2 pt-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileText size={16} className={theme.iconColor} />
              <span>Remarks & Notes</span>
            </h3>
            <p className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-sm leading-relaxed whitespace-pre-line">
              {c.remarks && c.remarks.trim() ? c.remarks : 'No special remarks or notes recorded for this customer.'}
            </p>
          </div>

        </div>
      </div>

      {/* Alerts Section */}
      <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <CustomerAlerts
          customer={c}
          isWadaana={isWadaana}
          onOpenBottleModal={() => setIsBottleModalOpen(true)}
        />
      </div>

      {/* History Section */}
      <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-emerald-600 rounded-full"></div>
            </div>
            <span className="ml-2 text-slate-600">Loading customer history...</span>
          </div>
        ) : (
          <CustomerHistory customer={c} isWadaana={isWadaana} />
        )}
      </div>

      {/* Bottle Adjustment / Retrieval Modal */}
      {isBottleModalOpen && (
        <BottleAdjustmentModal
          customer={c}
          onClose={() => setIsBottleModalOpen(false)}
          onSuccess={() => {
            // Refetch customer details
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
    </div>
  );
}
