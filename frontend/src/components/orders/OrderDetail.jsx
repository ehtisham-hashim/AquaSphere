import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Phone, MapPin, Calendar, 
  ExternalLink, ShoppingBag, User, Share2,
  Copy, CheckCircle2, Clock, Truck, Navigation, Camera, DollarSign,
  ArrowLeft
} from 'lucide-react';
import { Badge, StatusBadge, ImagePreviewModal } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { getOrderCleanName as formatItemName } from '../../constants/orders';

// ponytail: tabbed detail view groups actions logically; generous spacing prevents visual fatigue
export default function OrderDetail({ order, onClose, onSettle }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isWadaana } = useTenant();
  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'dispatch' | 'history'
  const [previewImage, setPreviewImage] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedPhoto, setCopiedPhoto] = useState(false);

  if (!order) return null;

  const customer = order.customer || {};
  const items = order.items || [];
  const deliveries = order.deliveries || [];
  const payments = order.payments || [];

  const grandTotal = items.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const balanceDue = grandTotal - totalPaid;
  const canSettle = balanceDue > 0 && order.deliveryStatus !== 'CANCELLED' && user?.role !== 'TRANSPORT_MANAGER';
  const totalQty = items.reduce((sum, i) => sum + Number(i.quantity || 0), 0);

  const orderDate = order.createdAt 
    ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const targetDate = order.expectedDelivery 
    ? new Date(order.expectedDelivery).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : orderDate;

  const theme = {
    primaryText: isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600',
    accentBg: isWadaana ? 'bg-sky-50' : 'bg-emerald-50',
    avatarBorder: isWadaana ? 'border-sky-200' : 'border-emerald-200',
    iconColor: isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600',
    badgeVariant: isWadaana ? 'sky' : 'emerald',
    tabActive: isWadaana ? 'bg-white text-slate-900 shadow-sm border-slate-200 font-bold' : 'bg-white text-slate-900 shadow-sm border-slate-200 font-bold',
  };

  const sanitizeMapLink = (link) => {
    if (!link) return null;
    const trimmed = link.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return `https://${trimmed}`;
  };

  const copyPhotoBinaryToClipboard = async () => {
    if (!customer.homePictureUrl) {
      toast.error('No house photo available for this customer.');
      return;
    }
    try {
      const response = await fetch(customer.homePictureUrl);
      const blob = await response.blob();
      const pngBlob = blob.type === 'image/png' ? blob : new Blob([blob], { type: 'image/png' });
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlob })
      ]);
      setCopiedPhoto(true);
      toast.success('House photo copied to clipboard (Binary PNG)!');
      setTimeout(() => setCopiedPhoto(false), 2000);
    } catch {
      navigator.clipboard.writeText(customer.homePictureUrl);
      setCopiedPhoto(true);
      toast.info('Photo URL copied to clipboard.');
      setTimeout(() => setCopiedPhoto(false), 2000);
    }
  };

  const buildDriverMessage = () => {
    const itemsList = items.map((i) => {
      const name = formatItemName(i.item?.name) || 'Item';
      const qty = i.quantity || 0;
      const rate = Number(i.price || 0);
      return `  • ${name}: ${qty} ${i.item?.unit || 'Bottles'} @ Rs. ${rate.toLocaleString()}`;
    }).join('\n');

    const cleanMapLink = sanitizeMapLink(customer.mapLink) || (customer.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}` : null);

    return [
      `📦 *DELIVERY ORDER — ${isWadaana ? 'WADAANA' : 'AQUASPHERE'}*`,
      `🆔 Order: #${order.id.substring(0, 8).toUpperCase()}`,
      `📅 Target Delivery: ${targetDate}`,
      ``,
      `👤 *CUSTOMER DETAILS:*`,
      `Name: ${customer.name || 'N/A'}`,
      `Phone: ${customer.phone || 'N/A'}`,
      customer.address ? `Address: ${customer.address}` : null,
      cleanMapLink ? `Maps Location: ${cleanMapLink}` : null,
      ``,
      `🛍️ *ITEMS TO DELIVER:*`,
      itemsList || '  • No items specified',
      `Total Units: ${totalQty}`,
      ``,
      `💰 *PAYMENT / BILL:*`,
      `Total Bill: Rs. ${grandTotal.toLocaleString()}`,
      `Paid: Rs. ${totalPaid.toLocaleString()}`,
      `To Collect: Rs. ${balanceDue > 0 ? balanceDue.toLocaleString() : '0 (Already Paid)'}`,
      `Payment Status: ${order.paymentStatus || 'UNPAID'}`,
      order.remarks ? `\n📝 Notes: ${order.remarks}` : null,
      customer.homePictureUrl ? `\n📸 House Picture:\n${customer.homePictureUrl}` : null,
    ].filter(Boolean).join('\n');
  };

  const handleCopyDriverDetails = async () => {
    navigator.clipboard.writeText(buildDriverMessage());
    setCopied(true);
    toast.success('Order & customer details copied for driver!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsAppDriver = () => {
    const text = encodeURIComponent(buildDriverMessage());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
      
      {/* Left Column: Customer Profile Card */}
      <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
        <div className="flex flex-col items-center text-center">
          
          {/* Customer Picture / Placeholder */}
          <div
            className={`w-32 h-32 rounded-2xl ${theme.accentBg} border-2 ${customer.homePictureUrl ? 'border-solid' : 'border-dashed'} ${theme.avatarBorder} flex items-center justify-center mb-3 shadow-inner overflow-hidden ${customer.homePictureUrl ? 'cursor-pointer' : ''}`}
            onClick={() => customer.homePictureUrl && setPreviewImage(customer.homePictureUrl)}
            title={customer.homePictureUrl ? 'Click to view full photo' : ''}
          >
            {customer.homePictureUrl ? (
              <img 
                src={customer.homePictureUrl} 
                alt={customer.name} 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'block'; }} 
              />
            ) : null}
            <User size={56} className={`${theme.iconColor} opacity-80 ${customer.homePictureUrl ? 'hidden' : ''}`} />
          </div>

          {customer.homePictureUrl && (
            <button
              type="button"
              onClick={copyPhotoBinaryToClipboard}
              className="mb-3 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              title="Copy House Photo (Binary PNG)"
            >
              {copiedPhoto ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Camera size={13} />}
              <span>{copiedPhoto ? 'Photo Copied!' : 'Copy House Photo'}</span>
            </button>
          )}

          {/* Customer Name & Badges */}
          <h2 className="text-lg font-bold text-slate-900">{customer.name || 'Unnamed Customer'}</h2>
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            <Badge variant={theme.badgeVariant}>{customer.type || 'Customer'}</Badge>
            <Badge variant="slate" className="uppercase text-[10px]">{isWadaana ? 'Wadaana Ind.' : 'AquaSphere'}</Badge>
          </div>

          {/* Customer Contact & Delivery Info */}
          <div className="w-full border-t border-slate-100 mt-5 pt-5 space-y-4 text-left text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <Phone size={16} className="text-slate-400 flex-shrink-0" />
              <span className="font-semibold flex-1 truncate">{customer.phone || 'No phone provided'}</span>
              {customer.phone && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`Customer: ${customer.name}\nPhone: ${customer.phone}`);
                      toast.success('Customer phone copied!');
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    title="Copy phone"
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    onClick={() => window.open(`https://api.whatsapp.com/send?phone=${customer.phone.replace(/[^0-9]/g, '')}`, '_blank')}
                    className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                    title="Open WhatsApp chat"
                  >
                    <Share2 size={15} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2.5 text-slate-600">
              <MapPin size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed text-xs sm:text-sm">{customer.address || 'No delivery address specified.'}</span>
            </div>

            {customer.mapLink && (
              <div className="pt-1">
                <a
                  href={customer.mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold ${isWadaana ? 'bg-sky-50 text-[#0ea5e9] hover:bg-sky-100 border border-sky-200' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'} transition-all`}
                >
                  <Navigation size={14} />
                  <span>Open in Google Maps</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  <span>Order Placed:</span>
                </div>
                <span className="font-semibold text-slate-700">{orderDate}</span>
              </div>

              <div className="flex items-center justify-between text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Clock size={14} />
                  <span>Target Delivery:</span>
                </div>
                <span className="font-bold text-slate-900">{targetDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* View Customer Profile Direct Shortcut Button */}
        {customer.id && (
          <div className="pt-5 mt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate(`/customers?id=${customer.id}`)}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xs"
            >
              <User size={15} className={theme.iconColor} />
              <span>View Full Customer Profile</span>
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Tabbed Workspace */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
        <div className="space-y-5">
          
          {/* Header & Main Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Order #{order.id?.substring(0, 8).toUpperCase()}
                </h1>
                <StatusBadge status={order.deliveryStatus} />
                <StatusBadge status={order.paymentStatus} />
              </div>
              <p className="text-xs text-slate-500 mt-1">Order details, delivery route dispatch, and payment logs</p>
            </div>
            
            <div className="flex items-center gap-2">
              {canSettle && onSettle && (
                <button
                  type="button"
                  onClick={() => onSettle(order)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
                  title="Settle Payment"
                >
                  <DollarSign size={14} />
                  <span>Settle Payment</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors"
                title="Back to orders list"
              >
                <ArrowLeft size={14} />
                <span>Back to Orders</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation Strip */}
          <div className="flex items-center gap-2 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('items')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'items'
                  ? theme.tabActive
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <ShoppingBag size={14} className={activeTab === 'items' ? theme.iconColor : 'text-slate-400'} />
              <span>Items & Billing</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-200 text-slate-700">
                {items.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dispatch')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'dispatch'
                  ? theme.tabActive
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Truck size={14} className={activeTab === 'dispatch' ? theme.iconColor : 'text-slate-400'} />
              <span>Driver Dispatch</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'history'
                  ? theme.tabActive
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Calendar size={14} className={activeTab === 'history' ? theme.iconColor : 'text-slate-400'} />
              <span>Deliveries & Payments</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-200 text-slate-700">
                {deliveries.length + payments.length}
              </span>
            </button>
          </div>

          {/* TAB 1: Items & Billing */}
          {activeTab === 'items' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* Financial Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Total Bill</span>
                  <span className="text-2xl font-bold font-mono text-slate-900 block mt-1">
                    Rs. {grandTotal.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500 mt-1 block">{totalQty} total units ordered</span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Amount Paid</span>
                  <span className="text-2xl font-bold font-mono text-emerald-600 block mt-1">
                    Rs. {totalPaid.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500 mt-1 block">Recorded in ledger</span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Balance Due</span>
                  <span className={`text-2xl font-bold font-mono block mt-1 ${balanceDue > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                    Rs. {balanceDue > 0 ? balanceDue.toLocaleString() : '0'}
                  </span>
                  <span className="text-xs text-slate-500 mt-1 block">
                    {balanceDue > 0 ? 'Pending collection' : 'Fully Settled'}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-xs tracking-wider select-none">
                    <tr>
                      <th className="py-3 px-4">Item Description</th>
                      <th className="py-3 px-4 text-center">Quantity</th>
                      <th className="py-3 px-4 text-right">Unit Price</th>
                      <th className="py-3 px-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                          No product items recorded for this order.
                        </td>
                      </tr>
                    ) : (
                      items.map((i, idx) => {
                        const lineTotal = Number(i.price || 0) * Number(i.quantity || 0);
                        return (
                          <tr key={i.id || idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-slate-900">
                              {formatItemName(i.item?.name) || 'Product Item'}
                              {i.item?.unit && (
                                <span className="ml-2 text-xs text-slate-400 font-normal">({i.item.unit})</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900 tabular-nums">
                              {i.quantity}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                              Rs. {Number(i.price || 0).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                              Rs. {lineTotal.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Remarks */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Delivery Notes & Instructions:
                </span>
                <p className="text-sm text-slate-800 leading-relaxed">
                  {order.remarks && order.remarks.trim() ? order.remarks : 'No special notes recorded.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Driver Dispatch */}
          {activeTab === 'dispatch' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Dispatch Order to Driver</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Quickly copy delivery details or send via WhatsApp</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyDriverDetails}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
                  >
                    {copied ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareWhatsAppDriver}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
                  >
                    <Share2 size={14} />
                    <span>Send via WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Pre-formatted Message Card */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white font-mono text-xs text-slate-700 leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap select-all">
                {buildDriverMessage()}
              </div>
            </div>
          )}

          {/* TAB 3: Deliveries & Payments */}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Deliveries Sub-table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Truck size={15} className={theme.iconColor} />
                  <span>Delivery Runs ({deliveries.length})</span>
                </h3>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-xs tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-center">Delivered</th>
                        <th className="py-3 px-4">Returned Bottles</th>
                        <th className="py-3 px-4 text-right">Cash Received</th>
                        <th className="py-3 px-4">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deliveries.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400 italic text-sm">
                            No delivery attempts logged yet.
                          </td>
                        </tr>
                      ) : (
                        deliveries.map(d => (
                          <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4 text-slate-700 text-xs">
                              {new Date(d.deliveredAt || d.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">
                              {d.qtyDelivered}
                            </td>
                            <td className="py-3.5 px-4 text-xs">
                              {d.bottlesReturnedGood > 0 && <span className="text-emerald-700 font-bold mr-2">↩ {d.bottlesReturnedGood} Good</span>}
                              {d.bottlesReturnedBroken > 0 && <span className="text-rose-700 font-bold">💔 {d.bottlesReturnedBroken} Broken</span>}
                              {!d.bottlesReturnedGood && !d.bottlesReturnedBroken && <span className="text-slate-400">—</span>}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                              {parseFloat(d.cashReceived || 0) > 0 ? `Rs. ${parseFloat(d.cashReceived).toLocaleString()}` : '—'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 italic text-xs">
                              {d.remarks || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payments Sub-table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign size={15} className={theme.iconColor} />
                  <span>Payment Receipts ({payments.length})</span>
                </h3>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-xs tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-center">Method</th>
                        <th className="py-3 px-4">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-400 italic text-sm">
                            No payment transactions recorded for this order.
                          </td>
                        </tr>
                      ) : (
                        payments.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4 text-slate-700 text-xs">
                              {new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                              Rs. {parseFloat(p.amount).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {p.type || 'Cash'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 italic text-xs">
                              {p.remarks || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Order ID: <code className="font-mono text-slate-600">#{order.id?.substring(0, 8).toUpperCase()}</code></span>
          <span>Logged in as: <strong className="text-slate-600">{user?.name || user?.role}</strong></span>
        </div>
      </div>

      {previewImage && (
        <ImagePreviewModal
          src={previewImage}
          alt={customer.name}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}
