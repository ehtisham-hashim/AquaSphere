import { CheckCircle2, AlertTriangle } from 'lucide-react';

export default function StatusCard({ label, confirmed, confirmedBy }) {
  return (
    <div className={`p-4 rounded-xl border flex items-center justify-between ${
      confirmed 
        ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
        : 'bg-amber-50 border-amber-200 text-amber-900'
    }`}>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</div>
        <div className="text-xs font-black mt-0.5">
          {confirmed ? `Confirmed${confirmedBy ? ` (${confirmedBy})` : ''}` : 'Awaiting Confirmation'}
        </div>
      </div>
      {confirmed 
        ? <CheckCircle2 className="text-emerald-600" size={20} /> 
        : <AlertTriangle className="text-amber-600" size={20} />
      }
    </div>
  );
}
