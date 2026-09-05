/**
 * Reusable glassmorphic chart tooltip for Recharts.
 */
export function ChartTooltip({ active, payload, label, formatter, title }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/95 backdrop-blur-md p-3 shadow-lg shadow-slate-900/5 min-w-[180px] text-xs select-none">
      <div className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 mb-2 flex items-center justify-between">
        <span>{title || label}</span>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Metrics</span>
      </div>
      <div className="space-y-1.5">
        {payload.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 truncate">
              <span 
                className="w-2 h-2 rounded-full shrink-0" 
                style={{ backgroundColor: item.color || item.fill || item.stroke }} 
              />
              <span className="text-slate-500 font-medium text-[11px] truncate">{item.name}:</span>
            </div>
            <span className="font-bold font-mono text-slate-900 text-[11px] shrink-0">
              {formatter ? formatter(item.value, item.name) : (typeof item.value === 'number' ? item.value.toLocaleString() : item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChartTooltip;
