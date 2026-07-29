import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { 
  X, Phone, MapPin, Calendar, 
  FileText, ExternalLink, ShoppingBag, User, Edit3, MessageCircle, MapPinIcon
} from 'lucide-react';
import { Badge } from '../ui';
import EditCustomerModal from './EditCustomerModal';
import CustomerHistory from './CustomerHistory';
import CustomerAlerts from './CustomerAlerts';
import { API_URL as API } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

// ponytail: two-column flat layout eliminates container fatigue; inline image placeholder uses lucide User icon
export default function CustomerDetails({ customer: initialCustomer, onClose, onCustomerUpdated, onCustomerDeleted }) {
  const { user } = useAuth();
  const [c, setC] = useState(initialCustomer);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const tenant = (localStorage.getItem('tenant') || 'aquasphere').toLowerCase();
  const isWadaana = tenant === 'wadaana';

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

  // tenant and isWadaana already declared above (lines 19-20)

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
        
        {/* Image Placeholder with User Icon */}
        <div className={`w-36 h-36 rounded-2xl ${theme.accentBg} border-2 border-dashed ${theme.avatarBorder} flex items-center justify-center mb-4 shadow-inner overflow-hidden relative`}>
          {c.homePictureUrl ? (
            <img 
              src={c.homePictureUrl} 
              alt={c.name} 
              className="w-full h-full object-cover rounded-2xl hover:scale-105 transition-transform duration-300"
              onError={(e) => { e.currentTarget.style.display = 'none'; }} 
            />
          ) : null}
          <User size={64} className={`${theme.iconColor} opacity-80`} />
        </div>

        {/* Name & Badges */}
        <h1 className="text-xl font-bold text-slate-900">{c.name}</h1>
        <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
          <Badge variant={theme.badgeVariant}>{c.type || 'Standard'}</Badge>
          <Badge variant="slate" className="uppercase text-[10px]">{isWadaana ? 'Wadaana Ind.' : 'AquaSphere'}</Badge>
        </div>

        {/* Contact Info List */}
        <div className="w-full border-t border-slate-100 mt-6 pt-6 space-y-4 text-left text-sm">
          <div className="flex items-center gap-3 text-slate-700">
            <Phone size={16} className="text-slate-400 flex-shrink-0" />
            <span className="font-semibold flex-1">{c.phone || 'No phone provided'}</span>
            {c.phone && (
              <a
                href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors flex-shrink-0"
                title="Send WhatsApp Message"
              >
                <MessageCircle size={18} />
              </a>
            )}
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
          
          {/* Header & Prominent Close Button */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Customer Overview</h2>
              <p className="text-slate-500 text-xs">Complete financial, credit, and product profiles</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditOpen(true)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 ${
                  isWadaana ? 'bg-sky-50 text-[#0ea5e9] hover:bg-sky-100 border-sky-200' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200'
                } border rounded-xl font-medium text-sm transition-colors shadow-sm`}
              >
                <Edit3 size={16} />
                <span>Edit Customer</span>
              </button>
              {['OWNER', 'MARKETING_MANAGER'].includes(user?.role) && (
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-medium text-sm transition-colors shadow-sm"
                >
                  <X size={16} />
                  <span>Delete</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-colors shadow-sm"
                title="Close Details"
              >
                <span>Close</span>
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Inline Financial & Custody Metrics Banner (No Box Fatigue) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center divide-y md:divide-y-0 md:divide-x divide-slate-200">
              
              <div className="p-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Current Debt</span>
                <span className={`text-lg font-bold block mt-1 ${isOverLimit ? 'text-red-600' : (currentBalance > 0 ? 'text-amber-600' : 'text-slate-800')}`}>
                  Rs. {currentBalance.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {limitVal > 0 ? `Limit: Rs. ${limitVal.toLocaleString()}` : 'No Limit'}
                </span>
              </div>

              <div className="p-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Security Deposit</span>
                <span className="text-lg font-bold text-slate-800 block mt-1">
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
                <span className="text-lg font-bold text-slate-800 block mt-1">
                  {!isWadaana ? `${c.cachedBottleBalance || 0} Empty` : `${c.creditDuration || 1} Days`}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {!isWadaana ? 'In customer possession' : 'Allowed credit span'}
                </span>
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
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ShoppingBag size={16} className={theme.iconColor} />
              <span>Purchased Products ({isWadaana ? 'Wadaana Preforms' : 'AquaSphere Delivery'})</span>
            </h3>
            
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
        <CustomerAlerts customer={c} isWadaana={isWadaana} />
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
    </div>
  );
}
