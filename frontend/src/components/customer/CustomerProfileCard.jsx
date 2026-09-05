import { Phone, MapPin, Package, Plus, X, Clock, ShoppingBag } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

export default function CustomerProfileCard({ customer: c, onNewOrder, onClear }) {
  const { tenant } = useTenant();
  const isWadaana = tenant === 'wadaana';

  const limitText = parseFloat(c.creditLimit) === 0 ? 'Unlimited' : `Rs. ${c.creditLimit}`;
  const lastDelivery = c.lastDeliveryAt
    ? new Date(c.lastDeliveryAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })
    : 'Never';

  // Check 30-day inactivity alert from specifications
  const isInactive30Days = c.lastDeliveryAt && (new Date() - new Date(c.lastDeliveryAt)) > (30 * 24 * 60 * 60 * 1000);

  return (
    <div className="card-surface overflow-hidden">
      {/* Header */}
      <div className="bg-[var(--brand)] px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 text-white font-bold flex items-center justify-center text-base shrink-0">
            {c.name ? c.name.charAt(0).toUpperCase() : '?'}
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">{c.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-medium">{c.type}</span>
              {c.phone && (
                <span className={`${isWadaana ? 'text-sky-100' : 'text-emerald-100'} text-[10px] flex items-center gap-0.5`}>
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

        {!isWadaana ? (
          <div className="p-3 text-center">
            <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">19L Bottles</div>
            <div className="text-sm font-bold mt-0.5 text-slate-800 flex items-center justify-center gap-1">
              <Package size={12} className="text-amber-500"/> {c.cachedBottleBalance || 0}
            </div>
          </div>
        ) : (
          <div className="p-3 text-center">
            <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Preferences</div>
            <div className="text-[11px] font-bold mt-1 flex items-center justify-center gap-1 text-slate-700">
              <ShoppingBag size={12} className="text-[#0ea5e9] flex-shrink-0"/>
              <span className="truncate max-w-[80px]">
                {c.buysPure05L || c.buysPure15L ? 'Pure' : ''} {(c.buysPure05L || c.buysPure15L) && (c.buysMix05L || c.buysMix15L) ? '+' : ''} {c.buysMix05L || c.buysMix15L ? 'Mix' : (!c.buysPure05L && !c.buysPure15L && 'None')}
              </span>
            </div>
          </div>
        )}

        <div className="p-3 text-center">
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Last Order</div>
          <div className={`text-sm font-bold mt-0.5 ${isInactive30Days ? 'text-red-600' : 'text-slate-800'}`}>{lastDelivery}</div>
        </div>
      </div>

      {/* Details */}
      <div className="p-3 space-y-1.5 text-xs text-slate-600">
        <div className="flex justify-between">
          <span className="text-slate-400">Credit Limit</span>
          <span className={`font-semibold ${parseFloat(c.creditLimit) === 0 ? (isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600') : 'text-slate-700'}`}>{limitText}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Security Deposit</span>
          <span className="font-semibold text-slate-700">Rs. {c.deposit || 0}</span>
        </div>
        {c.address && (
          <div className="flex items-start gap-1 pt-1 border-t border-slate-100">
            <MapPin size={11} className="text-slate-400 mt-0.5 flex-shrink-0"/>
            <span className="text-slate-500 leading-tight">{c.address}</span>
          </div>
        )}
      </div>

      {/* Alerts */}


      {isInactive30Days && (
        <div className="mx-3 mb-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
          <Clock size={14} className="flex-shrink-0 text-red-500"/>
          <span>No order repeat for over 30 days</span>
        </div>
      )}

      {/* Action */}
      <div className="p-3 pt-0">
        <button onClick={onNewOrder} className="btn-primary w-full justify-center">
          <Plus size={16}/> <span>New Order</span>
          <span className="opacity-70 text-[10px] font-normal ml-1">Alt+N</span>
        </button>
      </div>
    </div>
  );
}
