import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, Truck, DollarSign, Droplet, FileText, 
  ArrowUpRight
} from 'lucide-react';

// ponytail: tabbed table eliminates vertical accordion scroll; generous padding prevents eye fatigue
const BOTTLE_TYPE_LABELS = {
  NEW_PURCHASE: 'New Purchase',
  DELIVERED_TO_CUSTOMER: 'Delivered to Customer',
  RETURNED_GOOD: 'Returned (Good)',
  RETURNED_BROKEN: 'Returned (Broken)',
  MARKED_LOST: 'Marked Lost',
  AT_FACTORY_ADJUSTMENT: 'Factory Adjustment'
};

const PAYMENT_TYPE_LABELS = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque'
};

export default function CustomerHistory({ customer, isWadaana, onViewOrder }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders');

  const orders = customer?.orders || [];
  
  // Flatten deliveries from all orders
  const deliveries = orders.flatMap(order => 
    (order.deliveries || []).map(delivery => ({
      ...delivery,
      orderId: order.id,
      orderType: order.type
    }))
  ).sort((a, b) => new Date(b.deliveredAt || b.createdAt) - new Date(a.deliveredAt || a.createdAt));

  const payments = customer?.payments || [];
  const bottleTransactions = customer?.bottleTransactions || [];
  const auditLogs = customer?.auditLogs || [];

  const showBottleLedger = !isWadaana || bottleTransactions.length > 0;

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
      PARTIAL: 'bg-orange-50 text-orange-700 border-orange-200',
      CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
      PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      UNPAID: 'bg-rose-50 text-rose-700 border-rose-200',
      PARTIAL_PAID: 'bg-amber-50 text-amber-700 border-amber-200'
    };
    const cls = statusConfig[status] || 'bg-slate-100 text-slate-700 border-slate-200';
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${cls}`}>
        {status}
      </span>
    );
  };

  const handleOrderClick = (order) => {
    if (onViewOrder) {
      onViewOrder(order);
    } else {
      navigate(`/orders?orderId=${order.id}`);
    }
  };

  const tabs = [
    { 
      id: 'orders', 
      label: 'Orders', 
      count: orders.length, 
      icon: ShoppingBag 
    },
    { 
      id: 'deliveries', 
      label: 'Deliveries', 
      count: deliveries.length, 
      icon: Truck 
    },
    { 
      id: 'payments', 
      label: 'Payments', 
      count: payments.length, 
      icon: DollarSign 
    },
    ...(showBottleLedger ? [{ 
      id: 'bottles', 
      label: 'Bottle Ledger', 
      count: bottleTransactions.length, 
      icon: Droplet 
    }] : []),
    { 
      id: 'activity', 
      label: 'Activity Log', 
      count: auditLogs.length, 
      icon: FileText 
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header & Clean Spacious Tab Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Transaction & Activity History
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Orders, deliveries, payments, and account audit logs</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100/90 rounded-xl border border-slate-200/80">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent'
                }`}
              >
                <Icon size={15} className={isActive ? (isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600') : 'text-slate-400'} />
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                  isActive 
                    ? (isWadaana ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800') 
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Orders Table */}
      {activeTab === 'orders' && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-xs tracking-wider select-none sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4 text-right">Total Bill</th>
                  <th className="py-3 px-4 text-center">Delivery</th>
                  <th className="py-3 px-4 text-center">Payment</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 italic text-sm">
                      No orders placed by this customer yet.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const totalBill = (order.items || []).reduce(
                      (sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 0), 
                      0
                    );
                    const itemsSummary = (order.items || []).map(
                      i => `${i.item?.name || 'Item'} × ${i.quantity}`
                    ).join(', ');

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <span className="bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200">
                            #{order.id.substring(0, 8).toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs whitespace-nowrap">
                          {formatShortDate(order.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-800 max-w-sm truncate" title={itemsSummary}>
                          <span className="font-semibold">{itemsSummary || 'No items listed'}</span>
                          {order.remarks && (
                            <span className="block text-xs text-slate-400 italic mt-0.5 truncate">{order.remarks}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                          Rs. {totalBill.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {getStatusBadge(order.deliveryStatus)}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {getStatusBadge(order.paymentStatus)}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOrderClick(order)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition active:scale-95"
                          >
                            <span>View Order</span>
                            <ArrowUpRight size={14} className="text-slate-500" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Deliveries Table */}
      {activeTab === 'deliveries' && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-xs tracking-wider select-none sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4">Delivery Date</th>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4 text-center">Delivered Qty</th>
                  <th className="py-3 px-4">Bottles Returned</th>
                  <th className="py-3 px-4 text-right">Cash Received</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400 italic text-sm">
                      No delivery runs logged for this customer.
                    </td>
                  </tr>
                ) : (
                  deliveries.map((delivery) => {
                    const cash = parseFloat(delivery.cashReceived || 0);
                    return (
                      <tr key={delivery.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-slate-700 text-xs whitespace-nowrap">
                          {formatDate(delivery.deliveredAt || delivery.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => navigate(`/orders?orderId=${delivery.orderId}`)}
                            className="font-mono font-bold text-sky-700 hover:text-sky-800 hover:underline bg-sky-50 px-2 py-1 rounded text-xs border border-sky-200"
                          >
                            #{delivery.orderId.substring(0, 8).toUpperCase()}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900 tabular-nums">
                          {delivery.qtyDelivered}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-2 items-center">
                            {delivery.bottlesReturnedGood > 0 && (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                                ↩ {delivery.bottlesReturnedGood} Good
                              </span>
                            )}
                            {delivery.bottlesReturnedBroken > 0 && (
                              <span className="inline-flex items-center gap-1 text-rose-700 font-mono font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-xs">
                                💔 {delivery.bottlesReturnedBroken} Broken
                              </span>
                            )}
                            {(!delivery.bottlesReturnedGood && !delivery.bottlesReturnedBroken) && (
                              <span className="text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                          {cash > 0 ? (
                            <span className="font-bold text-emerald-600">
                              Rs. {cash.toLocaleString()}
                              {delivery.paymentMethod && (
                                <span className="ml-1 text-xs font-normal text-slate-400">
                                  ({PAYMENT_TYPE_LABELS[delivery.paymentMethod] || delivery.paymentMethod})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 italic max-w-xs truncate text-xs">
                          {delivery.remarks || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Payments Table */}
      {activeTab === 'payments' && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-xs tracking-wider select-none sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4 text-right">Amount (PKR)</th>
                  <th className="py-3 px-4 text-center">Payment Method</th>
                  <th className="py-3 px-4">Remarks / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-400 italic text-sm">
                      No standalone payments recorded for this customer.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-slate-700 text-xs whitespace-nowrap">
                        {formatDate(payment.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 tabular-nums whitespace-nowrap text-base">
                        Rs. {parseFloat(payment.amount).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {PAYMENT_TYPE_LABELS[payment.type] || payment.type || 'Cash'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 italic text-xs">
                        {payment.remarks || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Bottle Ledger Table */}
      {activeTab === 'bottles' && showBottleLedger && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-xs tracking-wider select-none sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Transaction Type</th>
                  <th className="py-3 px-4 text-center">Quantity Change</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bottleTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-400 italic text-sm">
                      No bottle transactions logged for this customer.
                    </td>
                  </tr>
                ) : (
                  bottleTransactions.map((tx) => {
                    const isIncrease = ['DELIVERED_TO_CUSTOMER', 'NEW_PURCHASE'].includes(tx.type);
                    const isDecrease = ['RETURNED_GOOD', 'RETURNED_BROKEN', 'MARKED_LOST'].includes(tx.type);
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-slate-700 text-xs whitespace-nowrap">
                          {formatDate(tx.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-900">
                          {BOTTLE_TYPE_LABELS[tx.type] || tx.type}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-mono font-bold ${
                            isIncrease 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                              : isDecrease 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {isIncrease ? `+${tx.quantity}` : isDecrease ? `-${tx.quantity}` : tx.quantity} bottles
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 italic text-xs">
                          {tx.reason || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Activity Log Table */}
      {activeTab === 'activity' && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-xs tracking-wider select-none sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action Event</th>
                  <th className="py-3 px-4">Performed By</th>
                  <th className="py-3 px-4">Change Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-400 italic text-sm">
                      No administrative changes logged for this profile.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => {
                    const getActionBadge = (action) => {
                      switch (action) {
                        case 'CUSTOMER_CREATED':
                          return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded text-xs font-extrabold uppercase">Created</span>;
                        case 'PHONE_CHANGED':
                          return <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-0.5 rounded text-xs font-extrabold uppercase">Phone Changed</span>;
                        case 'CREDIT_LIMIT_CHANGED':
                          return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded text-xs font-extrabold uppercase">Credit Limit</span>;
                        case 'CUSTOMER_DELETED':
                          return <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded text-xs font-extrabold uppercase">Deleted</span>;
                        default:
                          return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded text-xs font-extrabold uppercase">{action.replace('_', ' ')}</span>;
                      }
                    };

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-slate-500 text-xs whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getActionBadge(log.action)}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                          {log.performedBy || 'Admin'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium text-xs">
                          {log.details || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
