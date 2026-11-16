import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, Truck, DollarSign, Droplet, FileText, 
  ArrowUpRight, MapPin, ExternalLink
} from 'lucide-react';
import { usePagination } from '../../hooks/usePagination';
import TablePagination from '../common/TablePagination';
import { getOrderCleanName as formatItemName } from '../../constants/orders';
import { formatItemUnitTag, formatOrderItemsSummary } from '../../utils/unitFormat';

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

export default function CustomerHistory({ customer, isWadaana, onViewOrder, isLoading }) {
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
  const spotSales = customer?.spotSales || [];
  const bottleTransactions = customer?.bottleTransactions || [];
  const auditLogs = customer?.auditLogs || [];

  const ordersPagination = usePagination(orders, 10, `${customer?.id}_orders`);
  const deliveriesPagination = usePagination(deliveries, 10, `${customer?.id}_deliveries`);
  const paymentsPagination = usePagination(payments, 10, `${customer?.id}_payments`);
  const spotSalesPagination = usePagination(spotSales, 10, `${customer?.id}_spotSales`);
  const bottlePagination = usePagination(bottleTransactions, 10, `${customer?.id}_bottles`);
  const auditPagination = usePagination(auditLogs, 10, `${customer?.id}_audit`);

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

  const formatAuditDetails = (details) => {
    if (!details) return '—';
    
    let data = details;
    if (typeof details === 'string') {
      try {
        data = JSON.parse(details);
      } catch {
        // Plain string log e.g. "Customer Created: ..."
        return <span className="text-xs text-slate-700">{details}</span>;
      }
    }

    if (typeof data !== 'object' || data === null) {
      return <span className="text-xs text-slate-700">{String(data)}</span>;
    }

    // 1. Payment & Debt Settlement (CUSTOMER_DEBT_SETTLED)
    if (data.amountPaid !== undefined || data.paidAmount !== undefined || data.previousDebt !== undefined) {
      const paid = Number(data.amountPaid ?? data.paidAmount ?? 0);
      const method = (data.paymentMethod || data.method || 'CASH').replace('_', ' ');
      const prev = data.previousDebt !== undefined ? Number(data.previousDebt) : (data.previousBalance !== undefined ? Number(data.previousBalance) : null);
      const curr = data.newBalance !== undefined ? Number(data.newBalance) : (data.newDebt !== undefined ? Number(data.newDebt) : (data.remainingDebt !== undefined ? Number(data.remainingDebt) : null));
      const deposit = Number(data.depositApplied ?? 0);
      const ordersCount = data.settledOrdersCount ?? (Array.isArray(data.settledOrders) ? data.settledOrders.length : 0);
      const spotCount = data.settledSpotSalesCount ?? (Array.isArray(data.settledSpotSales) ? data.settledSpotSales.length : 0);
      const remarks = data.remarks || data.note;

      return (
        <div className="flex flex-col gap-1 py-0.5 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-emerald-700 font-mono">
              Received Rs. {paid.toLocaleString()}
            </span>
            <span className="px-1.5 py-0.2 bg-slate-100 rounded text-[10px] font-bold text-slate-600 border border-slate-200 uppercase tracking-wider">
              {method}
            </span>
            {deposit > 0 && (
              <span className="text-slate-500 font-medium">
                (+Rs. {deposit.toLocaleString()} deposit)
              </span>
            )}
            {prev !== null && curr !== null && (
              <span className="ml-1">
                {curr <= 0 ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Debt Cleared (Rs. 0)
                  </span>
                ) : (
                  <span className="text-slate-600">
                    Debt: <span className="line-through text-slate-400">Rs. {prev.toLocaleString()}</span> → <span className="font-bold text-rose-600 font-mono">Rs. {curr.toLocaleString()}</span>
                  </span>
                )}
              </span>
            )}
          </div>

          {(ordersCount > 0 || spotCount > 0) && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <span className="text-slate-400">Settled:</span>
              {ordersCount > 0 && (
                <span className="font-semibold text-slate-700">
                  {ordersCount} {ordersCount === 1 ? 'order' : 'orders'}
                </span>
              )}
              {ordersCount > 0 && spotCount > 0 && <span>&</span>}
              {spotCount > 0 && (
                <span className="font-semibold text-slate-700">
                  {spotCount} {spotCount === 1 ? 'counter sale' : 'counter sales'}
                </span>
              )}
            </div>
          )}

          {remarks && (
            <div className="text-[11px] text-slate-500 italic">
              "{remarks}"
            </div>
          )}
        </div>
      );
    }

    // 2. Phone changed
    if (data.oldPhone || data.newPhone) {
      return (
        <span className="text-xs text-slate-700">
          Phone changed: <span className="font-mono line-through text-slate-400">{data.oldPhone || 'None'}</span> → <span className="font-mono font-bold text-slate-900">{data.newPhone}</span>
        </span>
      );
    }

    // 3. Credit limit or duration
    if (data.creditDuration !== undefined || data.creditLimit !== undefined) {
      return (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
          {data.creditDuration !== undefined && (
            <span>Credit Terms: <strong>{data.creditDuration} days</strong></span>
          )}
          {data.creditLimit !== undefined && (
            <span>Credit Limit: <strong className="font-mono">Rs. {Number(data.creditLimit).toLocaleString()}</strong></span>
          )}
        </div>
      );
    }

    // 4. Bottle adjustments
    if (data.bottlesAdjusted !== undefined || data.quantity !== undefined) {
      const btlQty = data.bottlesAdjusted ?? data.quantity;
      return (
        <div className="flex items-center gap-1.5 text-xs text-slate-700">
          <span>Bottles: <strong className="font-mono">{btlQty > 0 ? `+${btlQty}` : btlQty}</strong></span>
          {data.reason && <span className="text-slate-400 italic">({data.reason})</span>}
        </div>
      );
    }

    // 5. Generic object fallback: convert camelCase keys to clean labels without raw JSON
    const entries = Object.entries(data).filter(([k, v]) => v !== null && v !== undefined && typeof v !== 'object');
    if (entries.length > 0) {
      return (
        <div className="flex flex-wrap gap-2 text-xs text-slate-700">
          {entries.map(([k, v]) => {
            const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            return (
              <span key={k} className="inline-flex items-center gap-1">
                <span className="text-slate-400 font-medium">{label}:</span>
                <strong className="text-slate-800">{String(v)}</strong>
              </span>
            );
          })}
        </div>
      );
    }

    return <span className="text-xs text-slate-500 italic">Administrative change recorded</span>;
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
      id: 'spotSales', 
      label: 'Counter Sales', 
      count: spotSales.length, 
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
      label: 'Returnable Custody', 
      count: bottleTransactions.length, 
      icon: Droplet 
    }] : []),
    { 
      id: 'activity', 
      label: 'Activity Log', 
      count: auditLogs.length, 
      icon: FileText 
    },
    { 
      id: 'preferences', 
      label: 'Products & Notes', 
      icon: MapPin 
    }
  ];

  return (
    <div className="flex flex-col min-w-0">
      {/* Seamless Single-Tier Underline Tabs (matches OrderDetail) */}
      <div className="px-5 sm:px-6 border-b border-slate-100 flex items-center gap-6 overflow-x-auto select-none no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer shrink-0 ${
                isActive
                  ? 'border-slate-900 text-slate-900 font-bold -mb-px'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon size={13} className={isActive ? 'text-slate-900' : 'text-slate-400'} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-600">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Canvas (100% Full Width with stable min-height to prevent layout jump) */}
      <div className="p-5 sm:px-6 py-4 min-w-0 space-y-4 min-h-[440px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
            <span className="ml-2 text-slate-500 text-xs">Loading customer records...</span>
          </div>
        ) : (
          <>

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
                    <td colSpan={7} className="py-20 text-center text-slate-400 italic text-sm">
                      No orders placed by this customer yet.
                    </td>
                  </tr>
                ) : (
                  ordersPagination.paginatedItems.map((order) => {
                    const sub = (order.items || []).reduce(
                      (sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 0), 
                      0
                    );
                    const totalBill = order.withGst ? sub + Math.round(sub * 0.18) : sub;
                    const primaryItem = order.items?.[0];

                    return (
                      <tr 
                        key={order.id} 
                        onClick={() => handleOrderClick(order)}
                        className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <span className="bg-slate-100 group-hover:bg-brand/10 group-hover:text-brand px-2 py-1 rounded text-xs border border-slate-200 transition-colors">
                            #{order.id.substring(0, 8).toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs whitespace-nowrap font-mono">
                          {formatShortDate(order.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div className="bg-slate-100 text-slate-700 font-bold px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1 text-xs shrink-0">
                              {formatOrderItemsSummary(order.items)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-slate-800 text-xs truncate max-w-[160px] sm:max-w-xs group-hover:text-brand transition-colors">
                                {formatItemName(primaryItem?.item?.name || 'Item')}{' '}
                                {primaryItem?.item && (
                                  <span className="text-[10px] font-normal text-slate-400">
                                    ({formatItemUnitTag(primaryItem.item, primaryItem.quantity)})
                                  </span>
                                )}
                              </span>
                              {order.items?.length > 1 && (
                                <span className="text-[10px] font-bold text-brand bg-brand-light px-1.5 py-0.5 rounded w-max mt-0.5">
                                  +{order.items.length - 1} more item{order.items.length > 2 ? 's' : ''}
                                </span>
                              )}
                              {order.remarks && (
                                <span className="text-[11px] text-slate-400 italic truncate max-w-[150px] mt-0.5" title={order.remarks}>
                                  {order.remarks}
                                </span>
                              )}
                            </div>
                          </div>
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
                        <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
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
          <TablePagination pagination={ordersPagination} />
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
                    <td colSpan={6} className="py-20 text-center text-slate-400 italic text-sm">
                      No delivery runs logged for this customer.
                    </td>
                  </tr>
                ) : (
                  deliveriesPagination.paginatedItems.map((delivery) => {
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
                              <span className="inline-flex items-center gap-1 text-amber-700 font-mono font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs">
                                💔 {delivery.bottlesReturnedBroken} Broken
                              </span>
                            )}
                            {delivery.bottlesLost > 0 && (
                              <span className="inline-flex items-center gap-1 text-rose-700 font-mono font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-xs">
                                ❌ {delivery.bottlesLost} Lost
                              </span>
                            )}
                            {(!delivery.bottlesReturnedGood && !delivery.bottlesReturnedBroken && !delivery.bottlesLost) && (
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
          <TablePagination pagination={deliveriesPagination} />
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
                    <td colSpan={4} className="py-20 text-center text-slate-400 italic text-sm">
                      No standalone payments recorded for this customer.
                    </td>
                  </tr>
                ) : (
                  paymentsPagination.paginatedItems.map((payment) => (
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
          <TablePagination pagination={paymentsPagination} />
        </div>
      )}

      {/* Tab 3.5: Counter Sales (Spot Sales) Table */}
      {activeTab === 'spotSales' && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-xs tracking-wider select-none sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4">Sale Date</th>
                  <th className="py-3 px-4">Sale #</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4 text-right">Billed (Rs)</th>
                  <th className="py-3 px-4 text-right">Paid (Rs)</th>
                  <th className="py-3 px-4 text-right">Debt (Rs)</th>
                  <th className="py-3 px-4 text-center">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {spotSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-slate-400 italic text-sm">
                      No walk-in counter sales recorded for this customer.
                    </td>
                  </tr>
                ) : (
                  spotSalesPagination.paginatedItems.map((sale) => {
                    const billed = Number(sale.totalAmount || 0);
                    const paid = Number(sale.amountPaid || sale.cashCollected || 0);
                    const debt = Number(sale.debtAmount || sale.creditAmount || 0);
                    const itemsSummary = (sale.items || []).map(
                      i => `${i.item?.name || i.saleType || 'Item'} × ${i.quantity}`
                    ).join(', ');

                    return (
                      <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-slate-700 text-xs whitespace-nowrap">
                          {formatDate(sale.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <span className="bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200">
                            {sale.saleNumber || `#${sale.id.slice(0, 8).toUpperCase()}`}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 text-xs max-w-xs truncate" title={itemsSummary}>
                          {itemsSummary || 'Counter Item'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                          Rs. {billed.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 tabular-nums">
                          Rs. {paid.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                          {debt > 0 ? (
                            <span className="font-bold text-rose-600">Rs. {debt.toLocaleString()}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-semibold uppercase">
                            {sale.paymentMethod || 'CASH'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <TablePagination pagination={spotSalesPagination} />
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
                  <th className="py-3 px-4">Returnable Item</th>
                  <th className="py-3 px-4">Transaction Type</th>
                  <th className="py-3 px-4 text-center">Quantity Change</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bottleTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-400 italic text-sm">
                      No returnable custody transactions logged for this customer.
                    </td>
                  </tr>
                ) : (
                  bottlePagination.paginatedItems.map((tx) => {
                    const isIncrease = ['DELIVERED_TO_CUSTOMER', 'NEW_PURCHASE'].includes(tx.type);
                    const isDecrease = ['RETURNED_GOOD', 'RETURNED_BROKEN', 'MARKED_LOST'].includes(tx.type);
                    const itemName = tx.item?.name || 'Empty 19L Bottles';
                    const itemUnit = tx.item?.unit || 'units';
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-slate-700 text-xs whitespace-nowrap">
                          {formatDate(tx.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-800 text-xs">
                          {itemName}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-700 text-xs">
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
                            {isIncrease ? `+${tx.quantity}` : isDecrease ? `-${tx.quantity}` : tx.quantity} {itemUnit}
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
          <TablePagination pagination={bottlePagination} />
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
                    <td colSpan={4} className="py-20 text-center text-slate-400 italic text-sm">
                      No administrative changes logged for this profile.
                    </td>
                  </tr>
                ) : (
                  auditPagination.paginatedItems.map((log) => {
                    const getActionBadge = (action) => {
                      switch (action) {
                        case 'CUSTOMER_DEBT_SETTLED':
                          return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Debt Settled</span>;
                        case 'CUSTOMER_CREATED':
                          return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Created</span>;
                        case 'CUSTOMER_EDITED':
                          return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Profile Updated</span>;
                        case 'PHONE_CHANGED':
                          return <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Phone Changed</span>;
                        case 'CREDIT_LIMIT_CHANGED':
                          return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Credit Terms</span>;
                        case 'CUSTOMER_ARCHIVED':
                          return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Archived</span>;
                        case 'CUSTOMER_RESTORED':
                          return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Restored</span>;
                        case 'CUSTOMER_DELETED':
                          return <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Deleted</span>;
                        default:
                          return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider">{action.replace(/_/g, ' ')}</span>;
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
                        <td className="py-3.5 px-4 text-slate-700 text-xs">
                          {formatAuditDetails(log.details)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <TablePagination pagination={auditPagination} />
        </div>
      )}

      {/* Tab 7: Products & Notes */}
      {activeTab === 'preferences' && (
        <div className="space-y-4 max-w-3xl animate-in fade-in duration-150">
          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-100 space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Purchased Catalog Preferences
            </span>
            {!isWadaana ? (
              <div className="flex flex-wrap gap-2 items-center">
                {customer?.buys19L && <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">19L Refill Bottles</span>}
                {customer?.buys05LPet && <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">0.5L PET Bottles</span>}
                {customer?.buys15LPet && <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">1.5L PET Bottles</span>}
                {!customer?.buys19L && !customer?.buys05LPet && !customer?.buys15LPet && (
                  <span className="text-slate-400 text-xs italic">No active product types configured for this customer.</span>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-1.5">Pure Preform Bottles</span>
                  <div className="flex flex-wrap gap-2">
                    {customer?.buysPure05L && <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">0.5L Pure Bottle (15g)</span>}
                    {customer?.buysPure15L && <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">1.5L Pure Bottle (30g)</span>}
                    {!customer?.buysPure05L && !customer?.buysPure15L && <span className="text-slate-400 text-xs italic">No pure preforms selected</span>}
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-200/70">
                  <span className="text-xs font-bold text-slate-700 block mb-1.5">Mix Preform Bottles</span>
                  <div className="flex flex-wrap gap-2">
                    {customer?.buysMix05L && <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">0.5L Mix Bottle (13g)</span>}
                    {customer?.buysMix15L && <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">1.5L Mix Bottle (27g)</span>}
                    {!customer?.buysMix05L && !customer?.buysMix15L && <span className="text-slate-400 text-xs italic">No mix preforms selected</span>}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-100 space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Customer Remarks</span>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {customer?.remarks && customer.remarks.trim() ? customer.remarks : 'No special remarks recorded for this customer.'}
            </p>
          </div>

          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-100 space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Physical Delivery Location</span>
            <p className="text-xs text-slate-700">{customer?.address || 'No physical address specified.'}</p>
            {customer?.mapLink && (
              <a
                href={customer.mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline mt-1"
              >
                <span>Open in Google Maps</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      )}
          </>
        )}
      </div>
    </div>
  );
}
