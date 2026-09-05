import { Truck, CheckCircle, MessageCircle, Printer, CreditCard, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const deliveryBadge = (s) => {
  const map = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
    PARTIAL: 'bg-sky-50 text-sky-700 border-sky-200',
  };
  return map[s] || 'bg-slate-100 text-slate-600 border-slate-200';
};

const getPaymentBadge = (status, isOverdue) => {
  if (isOverdue) return { label: 'Overdue', style: 'bg-rose-50 text-rose-700 border-rose-200 font-bold' };
  switch (status) {
    case 'PAID':
      return { label: 'Paid', style: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' };
    case 'PARTIAL':
      return { label: 'Partial', style: 'bg-sky-50 text-sky-700 border-sky-200 font-bold' };
    case 'UNPAID':
    default:
      return { label: 'Credit', style: 'bg-amber-50 text-amber-700 border-amber-200 font-bold' };
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
        toast.success('Order details ready to send to driver.');
      } else {
        toast.error('WhatsApp could not be opened.');
      }
    } catch {
      toast.error('WhatsApp could not be opened.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-slate-500">Loading orders...</p>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400">
        <CheckCircle size={32} className="mx-auto mb-2 opacity-30 text-slate-400" />
        <p className="text-xs font-bold text-slate-500">No orders found</p>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="table-container">
      <table className="w-full text-left text-xs">
        <thead>
          <tr>
            <th className="table-th">Order & Invoice</th>
            {showCustomerName && <th className="table-th">Customer</th>}
            <th className="table-th">Items</th>
            <th className="table-th">Financials (Received / Debt)</th>
            <th className="table-th">Payment Status</th>
            <th className="table-th">Verification</th>
            <th className="table-th text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
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
              <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                {/* Order & Invoice column */}
                <td className="table-td whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isNineteen ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-brand-muted text-brand-primary border-brand-primary/20'}`}>
                      {isNineteen ? '19L' : 'PET'}
                    </span>
                    <span className="text-xs text-slate-500 font-mono font-bold">#{o.id.slice(0, 6).toUpperCase()}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md font-mono border ${hasInvoice ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {hasInvoice ? `INV: ${o.invoiceNo || o.id.slice(0, 6).toUpperCase()}` : 'Pending Invoice'}
                    </span>
                  </div>
                </td>

                {/* Customer column */}
                {showCustomerName && (
                  <td className="table-td">
                    <div className="font-bold text-slate-800 text-xs">{o.customer?.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{o.customer?.phone}</div>
                  </td>
                )}

                {/* Items column */}
                <td className="table-td">
                  {o.items?.map((item, idx) => (
                    <div key={idx} className="text-slate-700 font-medium text-[11px]">
                      <span className="font-mono font-bold text-slate-800">{item.quantity}×</span> <span className="text-slate-600">{item.item?.name?.replace(/aquasphere|wadaana/gi, '').trim()}</span>
                    </div>
                  ))}
                  <div className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">{totalQty} Pcs Total</div>
                </td>

                {/* Financials column */}
                <td className="table-td whitespace-nowrap">
                  <div className="font-mono font-black text-slate-900 text-xs">₨ {total.toLocaleString()}</div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono mt-0.5">
                    <span className="text-emerald-700 font-bold">Rec: ₨ {alreadyPaid.toLocaleString()}</span>
                    {outstanding > 0 && (
                      <span className="text-rose-600 font-bold bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
                        Debt: ₨ {outstanding.toLocaleString()}
                      </span>
                    )}
                  </div>
                </td>

                {/* Payment Status column */}
                <td className="table-td whitespace-nowrap">
                  <div className="flex flex-col gap-1 items-start">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${deliveryBadge(o.deliveryStatus)}`}>
                      {o.deliveryStatus}
                    </span>
                    {o.deliveryStatus !== 'CANCELLED' && (
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${pBadge.style}`}>
                        {pBadge.label}
                      </span>
                    )}
                  </div>
                </td>

                {/* Verification column */}
                <td className="table-td whitespace-nowrap text-xs font-medium">
                  {o.deliveryStatus === 'CANCELLED' ? (
                    <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[10px]">
                      Order Cancelled
                    </span>
                  ) : alreadyPaid >= total && total > 0 ? (
                    <div className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                      <ShieldCheck size={12} className="text-emerald-600" />
                      <span>Verified</span>
                    </div>
                  ) : alreadyPaid > 0 ? (
                    <span className="text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200 text-[10px]">
                      Partial
                    </span>
                  ) : (
                    <span className="text-slate-400 italic text-[10px]">Pending</span>
                  )}
                </td>

                {/* Actions column */}
                <td className="table-td text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    {/* Share via WhatsApp */}
                    <button
                      onClick={() => handleShareWhatsApp(o)}
                      title="Share via WhatsApp"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg transition-colors"
                    >
                      <MessageCircle size={13} />
                    </button>

                    {/* Direct Print Invoice Button */}
                    {onPrint && (
                      <button
                        onClick={() => onPrint(o)}
                        title="Print Invoice"
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-1.5 rounded-lg border border-indigo-200 transition-colors"
                      >
                        <Printer size={13} />
                      </button>
                    )}

                    {/* Direct Record Payment Button */}
                    {onRecordPayment && outstanding > 0 && (
                      <button
                        onClick={() => onRecordPayment(o)}
                        title="Record Payment"
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2 py-1 rounded-lg text-xs font-bold border border-emerald-200 transition-colors flex items-center gap-1"
                      >
                        <CreditCard size={12} /> Pay
                      </button>
                    )}

                    {/* Process Delivery */}
                    {o.deliveryStatus !== 'DELIVERED' && o.deliveryStatus !== 'CANCELLED' && (
                      <button
                        onClick={() => onProcess(o)}
                        className="btn-primary py-1 px-2.5 text-xs flex items-center gap-1"
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
