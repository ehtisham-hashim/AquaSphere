import React from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';

// ponytail: consolidated high-visibility warning banner highlights strictly critical financial/asset risks
export default function CustomerAlerts({ customer }) {
  if (!customer) return null;

  const risks = [];
  const today = new Date();

  // 1. Credit Duration Overdue (Critical)
  const creditDuration = customer.creditDuration || 0;
  if (creditDuration > 0 && customer.orders?.length > 0) {
    const unpaidOrders = customer.orders.filter(
      (o) => o.paymentStatus === 'UNPAID' || o.paymentStatus === 'PARTIAL'
    );
    if (unpaidOrders.length > 0) {
      const oldestUnpaid = unpaidOrders[unpaidOrders.length - 1];
      const orderDate = new Date(oldestUnpaid.createdAt);
      const daysSinceOrder = Math.floor((today - orderDate) / (24 * 60 * 60 * 1000));
      if (daysSinceOrder > creditDuration) {
        const overdueDays = daysSinceOrder - creditDuration;
        risks.push({
          id: 'credit-overdue',
          severity: 'high',
          message: `Payment overdue by ${overdueDays} ${overdueDays === 1 ? 'day' : 'days'} (${creditDuration}-day term exceeded)`
        });
      }
    }
  }

  // 2. Outstanding Debt with Unpaid Orders (Critical)
  const currentBalance = Number(customer.currentBalance ?? 0);
  const unpaidOrdersCount = customer.orders?.filter(
    (o) => o.paymentStatus === 'UNPAID' || o.paymentStatus === 'PARTIAL'
  )?.length || 0;

  if (currentBalance > 0 && unpaidOrdersCount > 0) {
    risks.push({
      id: 'unpaid-debt',
      severity: currentBalance > 25000 ? 'high' : 'medium',
      message: `Rs. ${currentBalance.toLocaleString()} outstanding across ${unpaidOrdersCount} unpaid ${unpaidOrdersCount === 1 ? 'order' : 'orders'}`
    });
  }

  // 3. Returnable Bottle Custody Held (Asset Risk)
  const bottleBalance = parseInt(customer.cachedBottleBalance || 0, 10);
  if (bottleBalance > 0) {
    risks.push({
      id: 'bottles-custody',
      severity: 'medium',
      message: `${bottleBalance} ${bottleBalance === 1 ? 'bottle' : 'bottles'} held in customer custody`
    });
  }

  if (risks.length === 0) {
    return null;
  }

  const isHighRisk = risks.some((r) => r.severity === 'high');

  return (
    <div
      className={`px-5 sm:px-6 py-2.5 border-b flex flex-col sm:flex-row sm:items-center gap-2.5 text-xs sm:text-sm font-medium transition-colors ${
        isHighRisk
          ? 'bg-rose-50/90 border-rose-200 text-rose-900'
          : 'bg-amber-50/90 border-amber-200 text-amber-900'
      }`}
    >
      <div className="flex items-center gap-2 shrink-0">
        {isHighRisk ? (
          <AlertTriangle size={16} className="text-rose-600 shrink-0" />
        ) : (
          <AlertCircle size={16} className="text-amber-600 shrink-0" />
        )}
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border ${
            isHighRisk
              ? 'bg-rose-100 text-rose-800 border-rose-200'
              : 'bg-amber-100 text-amber-800 border-amber-200'
          }`}
        >
          {isHighRisk ? 'Critical Notice' : 'Account Notice'}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap min-w-0">
        {risks.map((risk, idx) => (
          <span key={risk.id} className="inline-flex items-center gap-2">
            {idx > 0 && <span className="opacity-40 select-none">•</span>}
            <span className="leading-snug">{risk.message}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
