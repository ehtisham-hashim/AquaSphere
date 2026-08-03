export default function DashboardKpiCard({ icon, title, value, subtitle, color = 'text-sky-600', bg = 'bg-sky-50', border = 'border-sky-100' }) {
  return (
    <div className={`bg-white border ${border} rounded-2xl p-5 shadow-sm flex flex-col h-full justify-between transition-all hover:shadow-md hover:-translate-y-0.5 group`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl ${bg} ${color} transition-transform group-hover:scale-110`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">{value}</p>
        <h4 className="text-xs font-bold text-slate-500 tracking-wider mt-2 uppercase">{title}</h4>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
