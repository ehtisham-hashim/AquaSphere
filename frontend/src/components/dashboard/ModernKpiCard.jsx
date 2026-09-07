import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function ModernKpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPeriod = 'vs last week',
  variant = 'brand', // 'brand' | 'emerald' | 'sky' | 'rose' | 'amber' | 'neutral'
  onClick
}) {
  const variantStyles = {
    brand: { bg: 'bg-brand-light', text: 'text-brand', border: 'border-brand-border' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    sky: { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-100' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    neutral: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  };

  const scheme = variantStyles[variant] || variantStyles.brand;
  const isPositive = typeof trend === 'number' && trend > 0;
  const isNeutral = trend === 0 || trend === undefined || trend === null;

  return (
    <div 
      onClick={onClick}
      className={`card-surface p-4 sm:p-5 transition-all duration-150 hover:border-slate-300 hover:shadow-sm flex flex-col justify-between ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-xl ${scheme.bg} ${scheme.text} shrink-0`}>
            <Icon size={17} />
          </div>
        )}
      </div>

      <div className="my-2 sm:my-3">
        <div className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums truncate">
          {value}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs min-h-[22px]">
        {trend !== undefined && trend !== null ? (
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isNeutral 
                ? 'bg-slate-100 text-slate-600' 
                : isPositive 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                  : 'bg-rose-50 text-rose-700 border border-rose-200/60'
            }`}>
              {isPositive ? <TrendingUp size={11} /> : isNeutral ? <Minus size={11} /> : <TrendingDown size={11} />}
              {Math.abs(trend)}%
            </span>
            <span className="text-[11px] text-slate-400 truncate">{trendPeriod}</span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400 truncate">{subtitle || 'Updated live'}</span>
        )}
      </div>
    </div>
  );
}
