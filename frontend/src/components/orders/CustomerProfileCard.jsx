import { Phone, MapPin, Package, AlertCircle, Plus, X, TrendingUp } from 'lucide-react';

export default function CustomerProfileCard({ customer: c, onNewOrder, onClear }) {
  const balanceColor = parseFloat(c.cachedBalance) > 0 ? 'text-red-600' : 'text-emerald-600';
  const limitText = parseFloat(c.creditLimit) === 0 ? 'Unlimited' : `Rs. ${c.creditLimit}`;
  const lastDelivery = c.lastDeliveryAt
    ? new Date(c.lastDeliveryAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })
    : 'Never';

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 text-white font-bold flex items-center justify-center text-lg">
            {c.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">{c.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-medium">{c.type}</span>
              {c.phone && (
                <span className="text-emerald-100 text-[10px] flex items-center gap-0.5">
                  <Phone size={9}/> {c.phone}
                </span>
              )}
            </div>
          </div>
        </div>
        <button onClick={onClear} className="text-white/70 hover:text-white transition-colors">
          <X size={16}/>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        <div className="p-3 text-center">
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Balance</div>
          <div className={`text-sm font-bold mt-0.5 ${balanceColor}`}>Rs. {parseFloat(c.cachedBalance || 0).toFixed(0)}</div>
        </div>
        <div className="p-3 text-center">
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">19L Bottles</div>
          <div className="text-sm font-bold mt-0.5 text-slate-800 flex items-center justify-center gap-1">
            <Package size={12} className="text-amber-500"/> {c.cachedBottleBalance || 0}
          </div>
        </div>
        <div className="p-3 text-center">
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Last Order</div>
          <div className="text-sm font-bold mt-0.5 text-slate-800">{lastDelivery}</div>
        </div>
      </div>

      {/* Details */}
      <div className="p-3 space-y-1.5 text-xs text-slate-600">
        <div className="flex justify-between">
          <span className="text-slate-400">Credit Limit</span>
          <span className={`font-semibold ${parseFloat(c.creditLimit) === 0 ? 'text-emerald-600' : 'text-slate-700'}`}>{limitText}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Default Price</span>
          <span className="font-semibold text-slate-700">Rs. {c.defaultPrice || 0}</span>
        </div>
        {c.address && (
          <div className="flex items-start gap-1 pt-1 border-t border-slate-100">
            <MapPin size={11} className="text-slate-400 mt-0.5 flex-shrink-0"/>
            <span className="text-slate-500 leading-tight">{c.address}</span>
          </div>
        )}
      </div>

      {/* Warning if over credit */}
      {parseFloat(c.creditLimit) > 0 && parseFloat(c.cachedBalance) >= parseFloat(c.creditLimit) && (
        <div className="mx-3 mb-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-700">
          <AlertCircle size={14} className="flex-shrink-0"/>
          <span>At or over credit limit</span>
        </div>
      )}

      {/* Action */}
      <div className="p-3 pt-0">
        <button onClick={onNewOrder}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm">
          <Plus size={16}/> New Order
          <span className="text-emerald-200 text-[10px] font-normal">Alt+N</span>
        </button>
      </div>
    </div>
  );
}
