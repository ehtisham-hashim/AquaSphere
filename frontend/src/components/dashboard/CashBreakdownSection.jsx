import React from 'react';
import { Banknote, Landmark, Smartphone, FileText, Package } from 'lucide-react';

export default function CashBreakdownSection({ cashByMethod = {}, salesBySize = {}, cashBySize = {} }) {
  const channels = [
    { key: 'CASH', label: 'Cash (Physical)', icon: Banknote, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { key: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Landmark, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    { key: 'EASYPAISA', label: 'EasyPaisa', icon: Smartphone, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
    { key: 'JAZZCASH', label: 'JazzCash', icon: Smartphone, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    { key: 'CHEQUE', label: 'Cheque', icon: FileText, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  ];

  const sizes = [
    { key: '19L', label: '19L Bottle', badgeBg: 'bg-sky-100 text-sky-800' },
    { key: '1.5L', label: '1.5L PET', badgeBg: 'bg-indigo-100 text-indigo-800' },
    { key: '0.5L', label: '0.5L PET', badgeBg: 'bg-teal-100 text-teal-800' },
  ];

  return (
    <div className="space-y-3">
      {/* Cash Inflow by Payment Channel */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
          <Banknote size={14} className="text-slate-400" />
          Cash Inflow by Payment Channel
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {channels.map(ch => {
            const amount = Number(cashByMethod?.[ch.key] || 0);
            return (
              <div key={ch.key} className={`card-surface p-3 border ${ch.border} rounded-xl flex flex-col justify-between`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-600">{ch.label}</span>
                  <div className={`w-6 h-6 rounded-lg ${ch.bg} flex items-center justify-center ${ch.color}`}>
                    <ch.icon size={13} />
                  </div>
                </div>
                <div className={`text-base font-bold font-mono ${ch.color}`}>
                  Rs. {amount.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sales & Cash by Bottle Size */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
          <Package size={14} className="text-slate-400" />
          Volume & Collections by Bottle Size
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {sizes.map(sz => {
            const sales = Number(salesBySize?.[sz.key] || 0);
            const cash = Number(cashBySize?.[sz.key] || 0);
            return (
              <div key={sz.key} className="card-surface p-3.5 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{sz.label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sz.badgeBg}`}>{sz.key}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Sales Billed:</span>
                  <span className="font-bold text-slate-900 font-mono">Rs. {sales.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Cash Received:</span>
                  <span className="font-bold text-emerald-700 font-mono">Rs. {cash.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
