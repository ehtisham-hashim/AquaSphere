import { useState } from 'react';
import { 
  ShoppingBag, Truck, DollarSign, Droplet, FileText, 
  ChevronDown, ChevronUp, Calendar
} from 'lucide-react';

// Human-readable labels for bottle transaction types
const BOTTLE_TYPE_LABELS = {
  NEW_PURCHASE: 'New Purchase',
  DELIVERED_TO_CUSTOMER: 'Delivered to Customer',
  RETURNED_GOOD: 'Returned (Good)',
  RETURNED_BROKEN: 'Returned (Broken)',
  MARKED_LOST: 'Marked Lost',
  AT_FACTORY_ADJUSTMENT: 'Factory Adjustment'
};

// Human-readable labels for order types across tenants
const ORDER_TYPE_LABELS = {
  NINETEEN_L: '19L Order',
  PET: 'PET Order',
  PURE_BOTTLES: 'Pure Bottles Order',
  MIX_BOTTLES: 'Mix Bottles Order'
};

// Payment type display labels
const PAYMENT_TYPE_LABELS = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque'
};

export default function CustomerHistory({ customer, isWadaana }) {
  const [expandedSections, setExpandedSections] = useState({
    orders: true,
    deliveries: true,
    payments: true,
    bottles: true,
    audit: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const theme = {
    iconColor: isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600',
    accentBg: isWadaana ? 'bg-sky-50' : 'bg-emerald-50'
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      DELIVERED: 'bg-green-100 text-green-800',
      PARTIAL: 'bg-orange-100 text-orange-800',
      CANCELLED: 'bg-slate-100 text-slate-600',
      PAID: 'bg-green-100 text-green-800',
      UNPAID: 'bg-red-100 text-red-800',
      PARTIAL_PAID: 'bg-orange-100 text-orange-800'
    };
    return statusConfig[status] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="space-y-4">
      <h3 className={`text-base font-bold text-slate-800 flex items-center gap-2`}>
        <Calendar size={18} className={theme.iconColor} />
        Transaction History
      </h3>

      {/* Orders Section */}
      <div className={`border border-slate-200 rounded-xl overflow-hidden ${theme.accentBg}`}>
        <button
          onClick={() => toggleSection('orders')}
          className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors border-b border-slate-200"
        >
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className={theme.iconColor} />
            <span className="font-semibold text-slate-700">Orders ({customer?.orders?.length || 0})</span>
          </div>
          {expandedSections.orders ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        
        {expandedSections.orders && (
          <div className="divide-y divide-slate-100">
            {customer?.orders && customer.orders.length > 0 ? (
              customer.orders.map(order => (
                <div key={order.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800">
                      {ORDER_TYPE_LABELS[order.type] || order.type}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(order.deliveryStatus)}`}>
                      {order.deliveryStatus}
                    </span>
                  </div>
                  {/* Order Items Detail */}
                  {order.items && order.items.length > 0 && (
                    <div className="mt-1.5 mb-1.5 space-y-0.5">
                      {order.items.map(oi => (
                        <div key={oi.id} className="flex items-center justify-between text-xs text-slate-600 pl-2 border-l-2 border-slate-200">
                          <span>{oi.item?.name || 'Item'} × {oi.quantity}</span>
                          <span className="font-medium">Rs. {parseFloat(oi.price).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600 text-xs">
                    <span>{formatDate(order.createdAt)}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(order.paymentStatus)}`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                  {order.remarks && <p className="text-xs text-slate-500 mt-1 italic">{order.remarks}</p>}
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-slate-500 text-sm">
                No orders yet
              </div>
            )}
          </div>
        )}
      </div>

      {/* Deliveries Section */}
      <div className={`border border-slate-200 rounded-xl overflow-hidden ${theme.accentBg}`}>
        <button
          onClick={() => toggleSection('deliveries')}
          className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors border-b border-slate-200"
        >
          <div className="flex items-center gap-2">
            <Truck size={16} className={theme.iconColor} />
            <span className="font-semibold text-slate-700">Deliveries ({customer?.orders?.reduce((sum, o) => sum + (o.deliveries?.length || 0), 0) || 0})</span>
          </div>
          {expandedSections.deliveries ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        
        {expandedSections.deliveries && (
          <div className="divide-y divide-slate-100">
            {customer?.orders?.some(o => o.deliveries?.length > 0) ? (
              customer.orders.flatMap(order =>
                (order.deliveries || []).map(delivery => (
                  <div key={delivery.id} className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        {delivery.qtyDelivered} bottles delivered
                      </span>
                      <span className="text-xs text-slate-500">{formatDate(delivery.deliveredAt || delivery.createdAt)}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 text-xs text-slate-600 mt-1">
                      {delivery.bottlesReturnedGood > 0 && <span className="text-green-700">↩️ {delivery.bottlesReturnedGood} returned good</span>}
                      {delivery.bottlesReturnedBroken > 0 && <span className="text-red-600">💔 {delivery.bottlesReturnedBroken} returned broken</span>}
                      {parseFloat(delivery.cashReceived) > 0 && <span className="text-emerald-700">💰 Rs. {parseFloat(delivery.cashReceived).toLocaleString()} received</span>}
                      {delivery.paymentMethod && <span className="text-slate-500">({PAYMENT_TYPE_LABELS[delivery.paymentMethod] || delivery.paymentMethod})</span>}
                    </div>
                    {delivery.remarks && <p className="text-xs text-slate-500 mt-1 italic">{delivery.remarks}</p>}
                  </div>
                ))
              )
            ) : (
              <div className="px-4 py-6 text-center text-slate-500 text-sm">
                No deliveries yet
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payments Section */}
      <div className={`border border-slate-200 rounded-xl overflow-hidden ${theme.accentBg}`}>
        <button
          onClick={() => toggleSection('payments')}
          className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors border-b border-slate-200"
        >
          <div className="flex items-center gap-2">
            <DollarSign size={16} className={theme.iconColor} />
            <span className="font-semibold text-slate-700">Payments ({customer?.payments?.length || 0})</span>
          </div>
          {expandedSections.payments ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        
        {expandedSections.payments && (
          <div className="divide-y divide-slate-100">
            {customer?.payments && customer.payments.length > 0 ? (
              customer.payments.map(payment => (
                <div key={payment.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        Rs. {parseFloat(payment.amount).toLocaleString()}
                      </span>
                      {payment.type && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {PAYMENT_TYPE_LABELS[payment.type] || payment.type}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">{formatDate(payment.createdAt)}</span>
                  </div>
                  {payment.remarks && <p className="text-xs text-slate-500 mt-1 italic">{payment.remarks}</p>}
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-slate-500 text-sm">
                No payments yet
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottle Transactions Section */}
      <div className={`border border-slate-200 rounded-xl overflow-hidden ${theme.accentBg}`}>
        <button
          onClick={() => toggleSection('bottles')}
          className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors border-b border-slate-200"
        >
          <div className="flex items-center gap-2">
            <Droplet size={16} className={theme.iconColor} />
            <span className="font-semibold text-slate-700">Bottle Ledger ({customer?.bottleTransactions?.length || 0})</span>
          </div>
          {expandedSections.bottles ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        
        {expandedSections.bottles && (
          <div className="divide-y divide-slate-100">
            {customer?.bottleTransactions && customer.bottleTransactions.length > 0 ? (
              customer.bottleTransactions.map(tx => (
                <div key={tx.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        {BOTTLE_TYPE_LABELS[tx.type] || tx.type}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        ['DELIVERED_TO_CUSTOMER', 'NEW_PURCHASE'].includes(tx.type)
                          ? 'bg-blue-50 text-blue-700'
                          : ['RETURNED_GOOD', 'RETURNED_BROKEN'].includes(tx.type)
                            ? 'bg-green-50 text-green-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {tx.quantity} bottles
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">{formatDate(tx.createdAt)}</span>
                  </div>
                  {tx.reason && <p className="text-xs text-slate-500 mt-1 italic">{tx.reason}</p>}
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-slate-500 text-sm">
                No bottle transactions yet
              </div>
            )}
          </div>
        )}
      </div>

      {/* Audit Log Section */}
      <div className={`border border-slate-200 rounded-xl overflow-hidden ${theme.accentBg}`}>
        <button
          onClick={() => toggleSection('audit')}
          className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors border-b border-slate-200"
        >
          <div className="flex items-center gap-2">
            <FileText size={16} className={theme.iconColor} />
            <span className="font-semibold text-slate-700">Activity Log ({customer?.auditLogs?.length || 0})</span>
          </div>
          {expandedSections.audit ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        
        {expandedSections.audit && (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {customer?.auditLogs && customer.auditLogs.length > 0 ? (
              customer.auditLogs.map(log => {
                const getActionBadge = (action) => {
                  switch (action) {
                    case 'CUSTOMER_CREATED':
                      return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">Customer Created</span>;
                    case 'PHONE_CHANGED':
                      return <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">Phone Changed</span>;
                    case 'CREDIT_LIMIT_CHANGED':
                      return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">Credit Limit Changed</span>;
                    case 'CUSTOMER_DELETED':
                      return <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">Customer Deleted</span>;
                    default:
                      return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">{action.replace('_', ' ')}</span>;
                  }
                };

                return (
                  <div key={log.id} className="px-4 py-3 text-sm hover:bg-white/60 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        {getActionBadge(log.action)}
                        <span className="text-xs font-bold text-slate-700">User: {log.performedBy || 'Admin'}</span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">{formatDate(log.createdAt)}</span>
                    </div>
                    {log.details && <p className="text-xs text-slate-600 mt-1 font-medium">{log.details}</p>}
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-6 text-center text-slate-500 text-sm">
                No activity logged
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
