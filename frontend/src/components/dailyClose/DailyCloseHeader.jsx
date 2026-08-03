export default function DailyCloseHeader({ label, labelColor = 'indigo', icon: Icon, title, description, date, onDateChange }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${colors[labelColor] || colors.indigo}`}>
            {label}
          </span>
        </div>
        <h1 className="text-2xl font-bold mt-1.5 text-slate-800 flex items-center gap-2">
          {Icon && <Icon className="w-6 h-6 text-slate-600" />} {title}
        </h1>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
      <input
        type="date"
        value={date}
        onChange={e => onDateChange(e.target.value)}
        className="px-4 py-2.5 bg-slate-50 border border-slate-300 text-slate-800 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 transition-colors shadow-xs"
      />
    </div>
  );
}
