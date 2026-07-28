import { AlertCircle, AlertTriangle, Clock, Droplet, DollarSign, Lock, TrendingUp, CalendarClock } from 'lucide-react';

export default function CustomerAlerts({ customer, isWadaana }) {
  const generateAlerts = () => {
    const alerts = [];
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Outstanding Balance Alert
    const balance = parseFloat(customer?.cachedBalance || 0);
    if (balance > 0) {
      alerts.push({
        id: 'balance',
        type: 'warning',
        icon: DollarSign,
        title: 'Outstanding Balance',
        message: `Rs. ${balance.toLocaleString()} pending`,
        severity: balance > 10000 ? 'high' : 'medium'
      });
    }

    // 2. Credit Limit Alert
    const creditLimit = parseFloat(customer?.creditLimit || 0);
    if (creditLimit > 0 && balance >= creditLimit) {
      alerts.push({
        id: 'credit',
        type: 'error',
        icon: AlertTriangle,
        title: 'Credit Limit Exceeded',
        message: `Balance reached limit of Rs. ${creditLimit.toLocaleString()}`,
        severity: 'high'
      });
    }

    // 3. Credit Duration Overdue Alert
    const creditDuration = customer?.creditDuration || 0;
    if (creditDuration > 0 && balance > 0 && customer?.orders?.length > 0) {
      // Find the oldest unpaid order
      const unpaidOrders = customer.orders.filter(o => o.paymentStatus === 'UNPAID' || o.paymentStatus === 'PARTIAL');
      if (unpaidOrders.length > 0) {
        // Orders are sorted desc, so last is oldest
        const oldestUnpaid = unpaidOrders[unpaidOrders.length - 1];
        const orderDate = new Date(oldestUnpaid.createdAt);
        const daysSinceOrder = Math.floor((today - orderDate) / (24 * 60 * 60 * 1000));
        if (daysSinceOrder > creditDuration) {
          alerts.push({
            id: 'credit-overdue',
            type: 'error',
            icon: CalendarClock,
            title: 'Credit Duration Overdue',
            message: `Payment overdue by ${daysSinceOrder - creditDuration} days (${creditDuration}-day limit exceeded)`,
            severity: 'high'
          });
        }
      }
    }

    // 4. Pending Orders Alert
    const pendingOrders = customer?.orders?.filter(o => o.deliveryStatus === 'PENDING')?.length || 0;
    if (pendingOrders > 0) {
      alerts.push({
        id: 'pending-orders',
        type: 'info',
        icon: TrendingUp,
        title: 'Pending Orders',
        message: `${pendingOrders} order${pendingOrders > 1 ? 's' : ''} awaiting delivery`,
        severity: 'medium'
      });
    }

    // 5. Partial Deliveries Alert
    const partialDeliveries = customer?.orders?.filter(o => o.deliveryStatus === 'PARTIAL')?.length || 0;
    if (partialDeliveries > 0) {
      alerts.push({
        id: 'partial',
        type: 'warning',
        icon: Droplet,
        title: 'Partial Deliveries',
        message: `${partialDeliveries} order${partialDeliveries > 1 ? 's' : ''} partially delivered`,
        severity: 'medium'
      });
    }

    // 6. Unpaid Orders Alert
    const unpaidOrders = customer?.orders?.filter(o => o.paymentStatus === 'UNPAID')?.length || 0;
    if (unpaidOrders > 0) {
      alerts.push({
        id: 'unpaid',
        type: 'error',
        icon: DollarSign,
        title: 'Unpaid Orders',
        message: `${unpaidOrders} order${unpaidOrders > 1 ? 's' : ''} awaiting payment`,
        severity: 'high'
      });
    }

    // 7. No Security Deposit Alert
    if (!customer?.deposit || customer.deposit === 0) {
      alerts.push({
        id: 'no-deposit',
        type: 'warning',
        icon: Lock,
        title: 'No Security Deposit',
        message: 'Customer has not provided security deposit',
        severity: 'low'
      });
    }

    // 8. No Recent Activity Alert
    if (customer?.lastDeliveryAt) {
      const lastDelivery = new Date(customer.lastDeliveryAt);
      if (lastDelivery < thirtyDaysAgo) {
        const daysInactive = Math.floor((today - lastDelivery) / (24 * 60 * 60 * 1000));
        alerts.push({
          id: 'inactive',
          type: 'warning',
          icon: Clock,
          title: 'No Recent Activity',
          message: `No activity for ${daysInactive} days`,
          severity: 'medium'
        });
      }
    } else {
      alerts.push({
        id: 'never-delivered',
        type: 'info',
        icon: Clock,
        title: 'No Delivery History',
        message: 'Customer has never received a delivery',
        severity: 'low'
      });
    }

    // 9. Pending Bottle Return — use cachedBottleBalance for accuracy
    const bottleBalance = parseInt(customer?.cachedBottleBalance || 0);
    if (bottleBalance > 0) {
      alerts.push({
        id: 'bottles-pending',
        type: 'warning',
        icon: Droplet,
        title: 'Pending Bottle Returns',
        message: `${bottleBalance} bottle${bottleBalance > 1 ? 's' : ''} in customer custody`,
        severity: 'medium'
      });
    }

    return alerts;
  };

  const alerts = generateAlerts();
  const theme = {
    accentBg: isWadaana ? 'bg-sky-50' : 'bg-emerald-50',
    iconColor: isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'border-l-4 border-red-500 bg-red-50';
      case 'medium':
        return 'border-l-4 border-orange-500 bg-orange-50';
      case 'low':
        return 'border-l-4 border-yellow-500 bg-yellow-50';
      default:
        return 'border-l-4 border-blue-500 bg-blue-50';
    }
  };

  if (alerts.length === 0) {
    return (
      <div className={`p-6 rounded-xl border border-slate-200 text-center ${theme.accentBg}`}>
        <div className="flex flex-col items-center justify-center">
          <AlertCircle size={32} className={`${theme.iconColor} mb-2 opacity-50`} />
          <p className="text-slate-600 font-medium">No Active Alerts</p>
          <p className="text-slate-500 text-sm mt-1">Customer is in good standing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className={`text-base font-bold text-slate-800 flex items-center gap-2`}>
        <AlertCircle size={18} className={theme.iconColor} />
        Customer Alerts ({alerts.length})
      </h3>
      
      <div className="space-y-2">
        {alerts.map(alert => {
          const IconComponent = alert.icon;
          return (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)} flex items-start gap-3`}
            >
              <IconComponent size={20} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-800 text-sm">{alert.title}</h4>
                <p className="text-slate-700 text-xs mt-0.5">{alert.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
