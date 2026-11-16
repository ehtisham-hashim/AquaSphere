import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Phone, MapPin, Calendar, 
  ExternalLink, ShoppingBag, User, Share2,
  Copy, CheckCircle2, Clock, Truck, Navigation, Camera, DollarSign,
  ArrowLeft, XCircle
} from 'lucide-react';
import { Badge, StatusBadge, ImagePreviewModal } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { getOrderCleanName as formatItemName } from '../../constants/orders';
import { formatItemUnitTag, formatOrderItemsSummary } from '../../utils/unitFormat';
import { openWhatsAppWeb } from '../../utils/whatsapp';

// ponytail: unified full-width card layout groups actions and customer context cleanly without layout cramping
export default function OrderDetail({ order, onClose, onSettle, onCancelOrder }) {
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

  const subtotal = items.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 0), 0);
  const gstAmount = order.withGst ? Math.round(subtotal * 0.18) : 0;
  const grandTotal = subtotal + gstAmount;
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const balanceDue = grandTotal - totalPaid;
  const canSettle = balanceDue > 0 && order.deliveryStatus !== 'CANCELLED' && user?.role !== 'TRANSPORT_MANAGER';
  const canCancel = ['OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'].includes(user?.role) &&
    order.deliveryStatus === 'PENDING' &&
    totalPaid === 0;

  const orderDate = order.createdAt 
    ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const targetDate = order.expectedDelivery 
    ? new Date(order.expectedDelivery).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : orderDate;

  const theme = {
    badgeVariant: isWadaana ? 'sky' : 'emerald',
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
      return `  • ${name}: ${qty} ${formatItemUnitTag(i.item, qty)} @ Rs. ${rate.toLocaleString()}`;
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
      `Summary: ${formatOrderItemsSummary(items)}`,
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
    openWhatsAppWeb('', buildDriverMessage());
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden animate-in fade-in duration-200">
      
      {/* ======================================================== */}
      {/* ROW 1: COMMAND BAR (Order Identity + Action Toolbar)    */}
      {/* ======================================================== */}
      <div className="px-5 sm:px-6 pt-4 pb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        {/* Left: Back + Avatar + Order Reference + Status Badges */}
        <div className="flex items-center gap-3.5 min-w-0 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors py-1.5 px-2 rounded-lg hover:bg-slate-100 -ml-2 shrink-0 cursor-pointer"
            title="Back to Orders list"
          >
            <ArrowLeft size={14} />
            <span>Orders</span>
          </button>

          <div className="h-5 w-px bg-slate-200 hidden sm:block shrink-0" />

          {/* Customer Avatar Frame with click preview */}
          <div
            className={`relative w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 ${customer.homePictureUrl ? 'cursor-pointer hover:opacity-90' : ''}`}
            onClick={() => customer.homePictureUrl && setPreviewImage(customer.homePictureUrl)}
            title={customer.homePictureUrl ? 'Click to view house photo' : ''}
          >
            {customer.homePictureUrl ? (
              <img
                src={customer.homePictureUrl}
                alt={customer.name || 'Customer'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <User size={20} className={`text-slate-400 ${customer.homePictureUrl ? 'hidden' : ''}`} />
          </div>

          {/* Order Reference & Live Status Badges */}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h1 className="text-base sm:text-lg font-bold font-mono text-slate-900 tracking-tight">
              Order #{order.id?.substring(0, 8).toUpperCase()}
            </h1>
            <StatusBadge status={order.deliveryStatus} />
            <StatusBadge status={order.paymentStatus} />
          </div>
        </div>

        {/* Right: Restrained Quick Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          {canCancel && onCancelOrder && (
            <button
              type="button"
              onClick={() => onCancelOrder(order)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg font-medium text-xs transition shadow-2xs cursor-pointer active:scale-95"
              title="Cancel this order"
            >
              <XCircle size={13} />
              <span>Cancel</span>
            </button>
          )}

          {customer.homePictureUrl && (
            <button
              type="button"
              onClick={copyPhotoBinaryToClipboard}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-medium text-xs transition shadow-2xs active:scale-95 cursor-pointer"
              title="Copy house photo to clipboard"
            >
              {copiedPhoto ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Camera size={13} className="text-slate-500" />}
              <span className="hidden sm:inline">{copiedPhoto ? 'Photo Copied' : 'House Photo'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleShareWhatsAppDriver}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-medium text-xs transition shadow-2xs active:scale-95 cursor-pointer"
            title="Send driver delivery slip via WhatsApp"
          >
            <Share2 size={13} className="text-slate-500" />
            <span className="hidden sm:inline">WhatsApp Slip</span>
          </button>

          {canSettle && onSettle && (
            <button
              type="button"
              onClick={() => onSettle(order)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition shadow-2xs active:scale-95 cursor-pointer"
              title="Settle Payment"
            >
              <DollarSign size={13} />
              <span>Settle Payment</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* ROW 2: CONTEXT & METADATA STRIP (Customer, Phone, Address)*/}
      {/* ======================================================== */}
      <div className="px-5 sm:px-6 py-2.5 bg-slate-50/70 border-t border-b border-slate-100 flex items-center gap-4 flex-wrap text-xs text-slate-600">
        {/* Customer Identity Link & Code */}
        <div className="flex items-center gap-2">
          {customer.id ? (
            <button
              type="button"
              onClick={() => navigate(`/customers?id=${customer.id}`)}
              className="font-bold text-slate-800 hover:text-brand hover:underline inline-flex items-center gap-1.5 cursor-pointer truncate max-w-[200px]"
              title="View customer profile"
            >
              <User size={13} className="text-slate-400" />
              <span>{customer.name || 'Unnamed Customer'}</span>
            </button>
          ) : (
            <span className="font-bold text-slate-800 inline-flex items-center gap-1.5">
              <User size={13} className="text-slate-400" />
              <span>{customer.name || 'Unnamed Customer'}</span>
            </span>
          )}

          <span className="font-mono text-[11px] font-bold bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200">
            {customer.customerCode || (customer.id ? `#${customer.id.substring(0, 6)}` : '')}
          </span>
          <Badge variant={theme.badgeVariant} className="text-[10px]">{customer.type || 'Customer'}</Badge>
        </div>

        {/* Phone with Call, Copy & WhatsApp shortcuts */}
        {customer.phone && (
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1 text-slate-700 hover:text-brand font-mono font-medium">
              <Phone size={12} className="text-slate-400" />
              <span>{customer.phone}</span>
            </a>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(customer.phone);
                toast.success('Phone copied!');
              }}
              className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
              title="Copy phone"
            >
              <Copy size={11} />
            </button>
            <button
              type="button"
              onClick={() => openWhatsAppWeb(customer.phone, '')}
              className="text-slate-400 hover:text-emerald-600 p-0.5 cursor-pointer"
              title="Open WhatsApp"
            >
              <Share2 size={11} />
            </button>
          </div>
        )}

        {/* Delivery Address */}
        {customer.address && (
          <div className="flex items-center gap-1 text-slate-600 max-w-md truncate border-l border-slate-200 pl-3" title={customer.address}>
            <MapPin size={12} className="text-slate-400 shrink-0" />
            <span className="truncate">{customer.address}</span>
            {customer.mapLink && (
              <a
                href={customer.mapLink}
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

        {/* Target Delivery Date */}
        <div className="flex items-center gap-1.5 text-slate-500 border-l border-slate-200 pl-3">
          <Clock size={12} className="text-slate-400 shrink-0" />
          <span>Target: <strong className="text-slate-700 font-medium">{targetDate}</strong></span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ROW 3: FINANCIAL KPI METRICS STRIP (3 Clean Columns)    */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-white border-b border-slate-100 px-5 sm:px-6 py-3.5">
        {/* Col 1: Total Bill */}
        <div className="py-2 sm:py-0 sm:pr-4 flex flex-col justify-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Bill</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-base sm:text-lg font-bold font-mono text-slate-900 tabular-nums">
              Rs. {grandTotal.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        {/* Col 2: Amount Paid */}
        <div className="py-2 sm:py-0 sm:px-4 flex flex-col justify-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Amount Paid</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-base sm:text-lg font-bold font-mono text-emerald-600 tabular-nums">
              Rs. {totalPaid.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">Recorded</span>
          </div>
        </div>

        {/* Col 3: Balance Due */}
        <div className="py-2 sm:py-0 sm:pl-4 flex flex-col justify-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Balance Due</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className={`text-base sm:text-lg font-bold font-mono tabular-nums ${balanceDue > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              Rs. {balanceDue > 0 ? balanceDue.toLocaleString() : '0'}
            </span>
            <span className="text-xs text-slate-400">
              {balanceDue > 0 ? 'Pending' : 'Settled'}
            </span>
          </div>
        </div>
      </div>

      {/* Full-Width Operational Workspace with Scrollable Tabs */}
      <div className="flex flex-col min-w-0">
        
        {/* Seamless Underline Tabs */}
        <div className="px-5 sm:px-6 border-b border-slate-100 flex items-center gap-6 overflow-x-auto select-none no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('items')}
            className={`py-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'items'
                ? 'border-slate-900 text-slate-900 font-bold -mb-px'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag size={13} className={activeTab === 'items' ? 'text-slate-900' : 'text-slate-400'} />
            <span>Order Items</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-600">
              {items.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dispatch')}
            className={`py-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'dispatch'
                ? 'border-slate-900 text-slate-900 font-bold -mb-px'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck size={13} className={activeTab === 'dispatch' ? 'text-slate-900' : 'text-slate-400'} />
            <span>Driver Slip</span>
          </button>
        </div>

        {/* Tab Content Canvas (100% Full Width with stable min-height) */}
        <div className="p-5 sm:p-6 flex-1 min-w-0 space-y-5 min-h-[420px]">
          {/* TAB 1: Items & Billing */}
          {activeTab === 'items' && (
            <div className="space-y-5">
              {/* Items Container: Responsive Table (sm+) & Mobile Cards (< sm) */}
              <div className="hidden sm:block border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 uppercase font-bold text-xs tracking-wider select-none">
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
                        <td colSpan={4} className="py-8 text-center text-slate-400 italic text-xs">
                          No product items recorded for this order.
                        </td>
                      </tr>
                    ) : (
                      items.map((i, idx) => {
                        const lineTotal = Number(i.price || 0) * Number(i.quantity || 0);
                        return (
                          <tr key={i.id || idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-900 text-xs">
                              {formatItemName(i.item?.name) || 'Product Item'}
                              <span className="ml-2 text-[11px] text-slate-400 font-normal">
                                ({formatItemUnitTag(i.item, i.quantity)})
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 tabular-nums text-xs">
                              {i.quantity}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-700 tabular-nums text-xs">
                              Rs. {Number(i.price || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums text-xs">
                              Rs. {lineTotal.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Item Cards (< sm) */}
              <div className="block sm:hidden space-y-2.5">
                {items.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 italic border border-slate-200/80 rounded-xl bg-slate-50 text-xs">
                    No product items recorded for this order.
                  </div>
                ) : (
                  items.map((i, idx) => {
                    const lineTotal = Number(i.price || 0) * Number(i.quantity || 0);
                    return (
                      <div key={i.id || idx} className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-slate-900 text-xs">
                            {formatItemName(i.item?.name) || 'Product Item'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-mono font-bold text-xs text-slate-800 tabular-nums">
                            {i.quantity} {formatItemUnitTag(i.item, i.quantity)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-500">
                          <span>Rate: Rs. {Number(i.price || 0).toLocaleString()}</span>
                          <span className="font-bold font-mono text-slate-900">
                            Rs. {lineTotal.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Delivery Notes & Remarks */}
              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Delivery Notes & Instructions:
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {order.remarks && order.remarks.trim() ? order.remarks : 'No special notes recorded.'}
                </p>
              </div>

              {/* Downward Flow: Delivery Runs & Payment Receipts (Rendered only when records exist) */}
              {deliveries.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Truck size={14} className="text-slate-400" />
                    <span>Delivery Runs ({deliveries.length})</span>
                  </h3>

                  <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 uppercase font-bold text-xs tracking-wider">
                        <tr>
                          <th className="py-2.5 px-4 text-xs">Date</th>
                          <th className="py-2.5 px-4 text-center text-xs">Delivered</th>
                          <th className="py-2.5 px-4 text-xs">Returned Bottles</th>
                          <th className="py-2.5 px-4 text-right text-xs">Cash Received</th>
                          <th className="py-2.5 px-4 text-xs">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {deliveries.map(d => (
                          <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-4 text-slate-700 text-xs font-mono">
                              {new Date(d.deliveredAt || d.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-900 tabular-nums text-xs">
                              {d.qtyDelivered}
                            </td>
                            <td className="py-2.5 px-4 text-xs">
                              {d.bottlesReturnedGood > 0 && <span className="text-emerald-700 font-bold mr-2">↩ {d.bottlesReturnedGood} Good</span>}
                              {d.bottlesReturnedBroken > 0 && <span className="text-amber-700 font-bold mr-2">💔 {d.bottlesReturnedBroken} Broken</span>}
                              {d.bottlesLost > 0 && <span className="text-rose-700 font-bold">❌ {d.bottlesLost} Lost</span>}
                              {!d.bottlesReturnedGood && !d.bottlesReturnedBroken && !d.bottlesLost && <span className="text-slate-400">—</span>}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums text-xs">
                              {parseFloat(d.cashReceived || 0) > 0 ? `Rs. ${parseFloat(d.cashReceived).toLocaleString()}` : '—'}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500 italic text-xs">
                              {d.remarks || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {payments.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <DollarSign size={14} className="text-slate-400" />
                    <span>Payment Receipts ({payments.length})</span>
                  </h3>

                  <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 uppercase font-bold text-xs tracking-wider">
                        <tr>
                          <th className="py-2.5 px-4 text-xs">Date</th>
                          <th className="py-2.5 px-4 text-right text-xs">Amount</th>
                          <th className="py-2.5 px-4 text-center text-xs">Method</th>
                          <th className="py-2.5 px-4 text-xs">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payments.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-4 text-slate-700 text-xs font-mono">
                              {new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600 tabular-nums text-xs">
                              Rs. {parseFloat(p.amount).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {p.type || 'Cash'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 italic text-xs">
                              {p.remarks || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Driver Dispatch */}
          {activeTab === 'dispatch' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Dispatch Order to Driver</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Copy delivery details or send directly via WhatsApp</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyDriverDetails}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium transition shadow-2xs active:scale-95 cursor-pointer"
                  >
                    {copied ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareWhatsAppDriver}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-2xs active:scale-95 cursor-pointer"
                  >
                    <Share2 size={13} />
                    <span>Send WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Pre-formatted Message Card */}
              <div className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/30 font-mono text-xs text-slate-700 leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap select-all">
                {buildDriverMessage()}
              </div>
            </div>
          )}

          {/* Footer Info Strip */}
          <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100">
            <span>Order Reference: <code className="font-mono text-slate-600">#{order.id?.substring(0, 8).toUpperCase()}</code></span>
            <span>Audited by: <strong className="text-slate-600">{user?.name || user?.role}</strong></span>
          </div>
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
