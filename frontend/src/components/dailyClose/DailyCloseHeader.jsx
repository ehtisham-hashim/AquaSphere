
export default function DailyCloseHeader({ label, labelColor = 'indigo', icon: Icon, title, description, date, onDateChange }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${colors[labelColor] || colors.indigo}`}>
            {label}
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black mt-1 text-slate-800 tracking-tight flex items-center gap-2">
          {Icon && <Icon className="w-6 h-6 text-brand-primary" />} {title}
        </h1>
        {description && <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
      <div className="relative">
        <input
          type="date"
          value={date}
          onChange={e => onDateChange(e.target.value)}
          className="input-base text-xs py-2 font-mono font-bold w-full sm:w-auto"
        />
      </div>
    </div>
  );
}
