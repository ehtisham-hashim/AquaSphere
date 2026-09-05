export default function DashboardKpiCard({ icon, title, value, subtitle, color = 'text-brand-primary', bg = 'bg-brand-muted', border = 'border-slate-200' }) {
  return (
    <div className={`card-surface p-4 sm:p-5 flex flex-col h-full justify-between transition-all hover:shadow-md group ${border}`}>
      <div className="flex justify-between items-start mb-3">
        <div className={`p-2.5 rounded-xl ${bg} ${color} transition-transform group-hover:scale-105`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-xl sm:text-2xl font-mono font-black text-slate-900 tracking-tight">{value}</p>
        <h4 className="text-[11px] font-bold text-slate-500 tracking-wider mt-1 uppercase">{title}</h4>
        {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
