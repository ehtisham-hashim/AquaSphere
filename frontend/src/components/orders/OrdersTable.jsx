import { Clock, Truck, CheckCircle, MessageCircle, Printer, CreditCard, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const deliveryBadge = (s) => {
  const map = {
    PENDING: 'bg-amber-100 text-amber-700 border border-amber-200',
    DELIVERED: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    CANCELLED: 'bg-rose-100 text-rose-700 border border-rose-200',
    PARTIAL: 'bg-sky-100 text-sky-700 border border-sky-200',
  };
  return map[s] || 'bg-slate-100 text-slate-600';
};

const getPaymentBadge = (status, isOverdue) => {
  if (isOverdue) return { label: '🔴 Overdue', style: 'bg-rose-100 text-rose-800 border border-rose-300 font-black' };
  switch (status) {
    case 'PAID':
      return { label: '🟢 Paid', style: 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold' };
    case 'PARTIAL':
      return { label: '🔵 Partial', style: 'bg-sky-100 text-sky-800 border border-sky-200 font-bold' };
    case 'UNPAID':
    default:
      return { label: '🔴 Credit', style: 'bg-amber-100 text-amber-800 border border-amber-200 font-bold' };
  }
};

export default function OrdersTable({
  orders,
  isLoading,
  onProcess,
  onPrint,
  onRecordPayment,
  showCustomerName
}) {
  const handleShareWhatsApp = (order) => {
    try {
      const text = `*New Delivery*\nOrder: #${order.id.slice(0, 6).toUpperCase()}\nCustomer: ${order.customer?.name || 'Unknown'}\nPhone: ${order.customer?.phone || 'Unknown'}\nTotal: Rs. ${order.items?.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0) || 0}\nAddress: ${order.customer?.address || 'See customer profile'}`;
      const encoded = encodeURIComponent(text);
      const url = `https://wa.me/?text=${encoded}`;
      const win = window.open(url, '_blank');
      if (win) {
        toast.success('✅ Order details ready to send to driver.');
      } else {
        toast.error('❌ WhatsApp could not be opened.');
      }
    } catch (err) {
      toast.error('❌ WhatsApp could not be opened.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium">Loading orders...</p>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400">
        <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm font-medium">No orders found</p>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Order & Invoice</th>
            {showCustomerName && <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>}
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Items</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Financials (Received / Debt)</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment Status</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Verification</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map(o => {
            const total = o.items?.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0) || 0;
            const totalQty = o.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0;
            const isNineteen = o.type === 'NINETEEN_L' || o.type === 'PURE_BOTTLES' || o.type === 'MIX_BOTTLES';

            // Financial Calculations
            const alreadyPaid = o.payments?.reduce((s, p) => s + parseFloat(p.amount || 0), 0) || (o.paymentStatus === 'PAID' ? total : 0);
            const outstanding = Math.max(0, total - alreadyPaid);

            // Overdue check
            const deliveryDate = o.expectedDelivery ? new Date(o.expectedDelivery) : new Date(o.createdAt);
            const isOverdue = o.paymentStatus !== 'PAID' && deliveryDate < today;
            const pBadge = getPaymentBadge(o.paymentStatus, isOverdue);

            // Invoice status
            const hasInvoice = Boolean(o.invoiceNo || o.id);

            return (
              <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                {/* Order & Invoice column */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isNineteen ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {isNineteen ? '19L' : 'PET'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono font-bold">#{o.id.slice(0, 6).toUpperCase()}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-mono ${hasInvoice ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-500'}`}>
                      {hasInvoice ? `INV: ${o.invoiceNo || o.id.slice(0, 6).toUpperCase()}` : 'Pending Invoice'}
                    </span>
                  </div>
                </td>

                {/* Customer column */}
                {showCustomerName && (
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800 text-sm">{o.customer?.name}</div>
                    <div className="text-xs text-slate-500">{o.customer?.phone}</div>
                  </td>
                )}

                {/* Items column */}
                <td className="px-4 py-3">
                  {o.items?.map((item, idx) => (
                    <div key={idx} className="text-slate-700 font-medium text-xs">
                      {item.quantity}× <span className="text-slate-500">{item.item?.name?.replace(/aquasphere|wadaana/gi, '').trim()}</span>
                    </div>
                  ))}
                  <div className="text-[11px] text-slate-400 font-semibold mt-0.5">{totalQty} Pcs Total</div>
                </td>

                {/* Financials column (Received & Outstanding) */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="font-black text-slate-900 text-sm">Rs. {total.toLocaleString()}</div>
                  <div className="flex items-center gap-2 text-xs mt-0.5">
                    <span className="text-emerald-700 font-bold">Rec: Rs. {alreadyPaid.toLocaleString()}</span>
                    {outstanding > 0 && (
                      <span className="text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        Debt: Rs. {outstanding.toLocaleString()}
                      </span>
                    )}
                  </div>
                </td>

                {/* Payment Status column */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex flex-col gap-1 items-start">
                    <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${deliveryBadge(o.deliveryStatus)}`}>
                      {o.deliveryStatus}
                    </span>
                    {o.deliveryStatus !== 'CANCELLED' && (
                      <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${pBadge.style}`}>
                        {pBadge.label}
                      </span>
                    )}
                  </div>
                </td>

                {/* Verification column */}
                <td className="px-4 py-3 whitespace-nowrap text-xs font-medium">
                  {o.deliveryStatus === 'CANCELLED' ? (
                    <span className="text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 text-[11px]">
                      Order Cancelled
                    </span>
                  ) : alreadyPaid >= total && total > 0 ? (
                    <div className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      <span>Payment Verified</span>
                    </div>
                  ) : alreadyPaid > 0 ? (
                    <span className="text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200 text-[11px]">
                      Partial Verification
                    </span>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">Pending Settlement</span>
                  )}
                </td>

                {/* Actions column */}
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Share via WhatsApp */}
                    <button
                      onClick={() => handleShareWhatsApp(o)}
                      title="Share via WhatsApp"
                      className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded-lg transition-colors"
                    >
                      <MessageCircle size={14} />
                    </button>

                    {/* Direct Print Invoice Button */}
                    {onPrint && (
                      <button
                        onClick={() => onPrint(o)}
                        title="Print Invoice"
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-1.5 rounded-lg border border-indigo-200 transition-colors"
                      >
                        <Printer size={14} />
                      </button>
                    )}

                    {/* Direct Record Payment Button for Accountant */}
                    {onRecordPayment && outstanding > 0 && (
                      <button
                        onClick={() => onRecordPayment(o)}
                        title="Record Payment"
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-200 transition-colors flex items-center gap-1"
                      >
                        <CreditCard size={13} /> Pay
                      </button>
                    )}

                    {/* Process Delivery */}
                    {o.deliveryStatus !== 'DELIVERED' && o.deliveryStatus !== 'CANCELLED' && (
                      <button
                        onClick={() => onProcess(o)}
                        className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <Truck size={12} /> Process
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
