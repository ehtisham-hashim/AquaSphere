import React, { useState } from 'react';
import { toast } from 'sonner';
import { 
  X, Phone, MapPin, Calendar, 
  FileText, ExternalLink, ShoppingBag, User, Share2,
  Copy, CheckCircle2, Clock, Truck, Navigation
} from 'lucide-react';
import { Badge, StatusBadge, ImagePreviewModal } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { getOrderCleanName as formatItemName } from '../../constants/orders';

// ponytail: layout mirrors CustomerDetails flat pattern; avoids modal bloat with inline swap view
export default function OrderDetail({ order, onClose }) {
  const { user } = useAuth();
  const { isWadaana } = useTenant();
  const [previewImage, setPreviewImage] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!order) return null;

  const customer = order.customer || {};
  const items = order.items || [];
  const grandTotal = items.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 0), 0);
  const totalPaid = (order.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const balanceDue = grandTotal - totalPaid;
  const totalQty = items.reduce((sum, i) => sum + Number(i.quantity || 0), 0);

  const orderDate = order.createdAt 
    ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const targetDate = order.expectedDelivery 
    ? new Date(order.expectedDelivery).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : orderDate;

  // Tenant-aware theme classes matching CustomerDetails
  const theme = {
    primaryText: isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600',
    accentBg: isWadaana ? 'bg-sky-50' : 'bg-emerald-50',
    avatarBorder: isWadaana ? 'border-sky-200' : 'border-emerald-200',
    iconColor: isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600',
    badgeVariant: isWadaana ? 'sky' : 'emerald',
    bannerBorder: isWadaana ? 'border-sky-200 bg-sky-50/50' : 'border-emerald-200 bg-emerald-50/50',
    buttonPrimary: isWadaana ? 'bg-[#0ea5e9] hover:bg-sky-500' : 'bg-emerald-600 hover:bg-emerald-500',
  };

  // Full order + customer payload formatted for dispatch to driver (WhatsApp or SMS)
  const buildDriverMessage = () => {
    const itemsList = items.map((i) => {
      const name = formatItemName(i.item?.name) || 'Item';
      const qty = i.quantity || 0;
      const rate = Number(i.price || 0);
      return `  • ${name}: ${qty} ${i.item?.unit || 'Bottles'} @ Rs. ${rate.toLocaleString()}`;
    }).join('\n');

    return [
      `📦 *DELIVERY ORDER — ${isWadaana ? 'WADAANA' : 'AQUASPHERE'}*`,
      `🆔 Order: #${order.id.substring(0, 8).toUpperCase()}`,
      `📅 Target Delivery: ${targetDate}`,
      ``,
      `👤 *CUSTOMER DETAILS:*`,
      `Name: ${customer.name || 'N/A'}`,
      `Phone: ${customer.phone || 'N/A'}`,
      customer.address ? `Address: ${customer.address}` : null,
      customer.mapLink ? `Maps Location: ${customer.mapLink}` : null,
      customer.homePictureUrl ? `House Picture: ${customer.homePictureUrl}` : null,
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
      ``,
      order.remarks ? `📝 Notes: ${order.remarks}` : null,
    ].filter(Boolean).join('\n');
  };

  // Customer-only details text (same as CustomerDetails)
  const buildCustomerText = () => {
    return [
      `📋 *Customer Details*`,
      `👤 Name: ${customer.name || 'N/A'}`,
      `📞 Phone: ${customer.phone || 'N/A'}`,
      customer.address ? `📍 Address: ${customer.address}` : null,
      customer.mapLink ? `🗺️ Map: ${customer.mapLink}` : null,
      customer.homePictureUrl ? `🖼️ Photo: ${customer.homePictureUrl}` : null,
    ].filter(Boolean).join('\n');
  };

  const handleCopyDriverDetails = () => {
    navigator.clipboard.writeText(buildDriverMessage());
    setCopied(true);
    toast.success('Order & customer details copied for driver!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsAppDriver = () => {
    const text = encodeURIComponent(buildDriverMessage());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
      
      {/* Left Column: Customer Profile Card for Driver */}
      <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
        
        {/* Customer Picture / Placeholder */}
        <div
          className={`w-32 h-32 rounded-2xl ${theme.accentBg} border-2 ${customer.homePictureUrl ? 'border-solid' : 'border-dashed'} ${theme.avatarBorder} flex items-center justify-center mb-4 shadow-inner overflow-hidden ${customer.homePictureUrl ? 'cursor-pointer' : ''}`}
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

        {/* Customer Name & Badges */}
        <h2 className="text-lg font-bold text-slate-900">{customer.name || 'Unnamed Customer'}</h2>
        <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
          <Badge variant={theme.badgeVariant}>{customer.type || 'Customer'}</Badge>
          <Badge variant="slate" className="uppercase text-[10px]">{isWadaana ? 'Wadaana Ind.' : 'AquaSphere'}</Badge>
        </div>

        {/* Customer Contact & Delivery Info */}
        <div className="w-full border-t border-slate-100 mt-5 pt-5 space-y-4 text-left text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <Phone size={16} className="text-slate-400 flex-shrink-0" />
            <span className="font-semibold flex-1 truncate">{customer.phone || 'No phone provided'}</span>
            {customer.phone && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(buildCustomerText());
                    toast.success('Customer details copied to clipboard!');
                  }}
                  className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  title="Copy customer info"
                >
                  <Copy size={15} />
                </button>
                <button
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(buildCustomerText())}`, '_blank')}
                  className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                  title="Share customer info via WhatsApp"
                >
                  <Share2 size={15} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2.5 text-slate-600">
            <MapPin size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{customer.address || 'No delivery address specified.'}</span>
          </div>

          {customer.mapLink && (
            <div className="pt-2 flex flex-col gap-2">
              <a
                href={customer.mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${isWadaana ? 'bg-sky-50 text-[#0ea5e9] hover:bg-sky-100 border border-sky-200' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'} transition-all`}
              >
                <Navigation size={14} />
                <span>Open in Google Maps</span>
                <ExternalLink size={13} />
              </a>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-400 text-xs">
            <div className="flex items-center gap-1.5">
              <Calendar size={13} />
              <span>Order Placed:</span>
            </div>
            <span className="font-medium text-slate-600">{orderDate}</span>
          </div>

          <div className="flex items-center justify-between text-slate-400 text-xs">
            <div className="flex items-center gap-1.5">
              <Clock size={13} />
              <span>Target Delivery:</span>
            </div>
            <span className="font-semibold text-slate-800">{targetDate}</span>
          </div>
        </div>
      </div>

      {/* Right Column: Order Overview, Driver Dispatch & Products */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
        <div>
          {/* Header & Close Button */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-800">
                  Order #{order.id?.substring(0, 8).toUpperCase()}
                </h1>
                <StatusBadge status={order.deliveryStatus} />
                <StatusBadge status={order.paymentStatus} />
              </div>
              <p className="text-slate-500 text-xs mt-0.5">Delivery dispatch profile & order items breakdown</p>
            </div>
            
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs transition-colors shadow-2xs"
              title="Close Details"
            >
              <span>Back to Orders</span>
              <X size={16} />
            </button>
          </div>

          {/* Quick Dispatch to Driver Box (Primary Feature for TM) */}
          <div className={`mt-5 p-4 rounded-2xl border ${theme.bannerBorder} space-y-3`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${theme.accentBg} ${theme.iconColor}`}>
                  <Truck size={18} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">Send Order to Driver</h3>
                  <p className="text-[11px] text-slate-500">Copy customer & order details or share directly on WhatsApp</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyDriverDetails}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95"
                  title="Copy full delivery info to clipboard"
                >
                  {copied ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy for Driver'}</span>
                </button>

                <button
                  onClick={handleShareWhatsAppDriver}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
                  title="Open WhatsApp with prefilled order details"
                >
                  <Share2 size={14} />
                  <span>Send via WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Collapsible/Preview of text sent to driver */}
            <div className="bg-white/80 rounded-xl p-3 border border-slate-200/80 text-[11px] font-mono text-slate-600 leading-relaxed max-h-28 overflow-y-auto whitespace-pre-wrap select-all">
              {buildDriverMessage()}
            </div>
          </div>

          {/* Inline Financials & Settlement Banner */}
          <div className="mt-5 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
              
              <div className="p-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Bill</span>
                <span className="text-base sm:text-lg font-bold font-mono text-slate-900 block mt-1">
                  Rs. {grandTotal.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">{totalQty} Total Units</span>
              </div>

              <div className="p-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Amount Paid</span>
                <span className="text-base sm:text-lg font-bold font-mono text-emerald-600 block mt-1">
                  Rs. {totalPaid.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Recorded payments</span>
              </div>

              <div className="p-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Cash to Collect</span>
                <span className={`text-base sm:text-lg font-bold font-mono block mt-1 ${balanceDue > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                  Rs. {balanceDue > 0 ? balanceDue.toLocaleString() : '0'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {balanceDue > 0 ? 'Pending collection' : 'Fully Settled'}
                </span>
              </div>

              <div className="p-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Target Delivery</span>
                <span className="text-sm sm:text-base font-bold text-slate-800 block mt-1 truncate">{targetDate}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">{order.type || 'STANDARD'}</span>
              </div>

            </div>
          </div>

          {/* Ordered Products Table */}
          <div className="mt-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag size={15} className={theme.iconColor} />
                <span>Ordered Items ({items.length})</span>
              </h3>
              <span className="text-xs font-semibold text-slate-500 font-mono">
                Total Qty: <strong className="text-slate-800">{totalQty}</strong>
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Item Description</th>
                    <th className="py-2.5 px-3 text-center">Quantity</th>
                    <th className="py-2.5 px-4 text-right">Unit Price</th>
                    <th className="py-2.5 px-4 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                        No product items recorded for this order.
                      </td>
                    </tr>
                  ) : (
                    items.map((i, idx) => {
                      const lineTotal = Number(i.price || 0) * Number(i.quantity || 0);
                      return (
                        <tr key={i.id || idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-800">
                            {formatItemName(i.item?.name) || 'Product Item'}
                            {i.item?.unit && (
                              <span className="ml-2 text-[10px] text-slate-400 font-normal">({i.item.unit})</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                            {i.quantity}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                            Rs. {Number(i.price || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                            Rs. {lineTotal.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Delivery Remarks & Notes */}
          <div className="mt-5 space-y-1.5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={14} className={theme.iconColor} />
              <span>Delivery Instructions / Remarks</span>
            </h3>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-xs leading-relaxed">
              {order.remarks && order.remarks.trim() ? (
                <span className="font-medium text-slate-800">{order.remarks}</span>
              ) : (
                <span className="text-slate-400 italic">No special delivery instructions recorded.</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Order ID: <code className="font-mono text-slate-600">{order.id}</code></span>
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
