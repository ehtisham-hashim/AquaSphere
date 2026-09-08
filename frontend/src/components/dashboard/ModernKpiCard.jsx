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
    brand: { bg: 'bg-brand/10', text: 'text-brand' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    sky: { bg: 'bg-sky-50', text: 'text-sky-700' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700' },
    neutral: { bg: 'bg-slate-100', text: 'text-slate-600' },
  };

  const scheme = variantStyles[variant] || variantStyles.brand;
  const isPositive = typeof trend === 'number' && trend > 0;
  const isNeutral = trend === 0 || trend === undefined || trend === null;

  return (
    <div 
      onClick={onClick}
      className={`card-surface p-4 transition-all duration-150 hover:border-slate-300 flex flex-col justify-between ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
          {title}
        </span>
        {Icon && (
          <div className={`p-1.5 rounded-lg ${scheme.bg} ${scheme.text} shrink-0`}>
            <Icon size={16} />
          </div>
        )}
      </div>

      <div className="my-2">
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums truncate">
          {value}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs min-h-[20px]">
        {trend !== undefined && trend !== null ? (
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-bold ${
              isNeutral 
                ? 'bg-slate-100 text-slate-600' 
                : isPositive 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                  : 'bg-rose-50 text-rose-700 border border-rose-200/60'
            }`}>
              {isPositive ? <TrendingUp size={11} /> : isNeutral ? <Minus size={11} /> : <TrendingDown size={11} />}
              {Math.abs(trend)}%
            </span>
            <span className="text-xs text-slate-400 truncate">{trendPeriod}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 truncate">{subtitle || 'Updated live'}</span>
        )}
      </div>
    </div>
  );
}
