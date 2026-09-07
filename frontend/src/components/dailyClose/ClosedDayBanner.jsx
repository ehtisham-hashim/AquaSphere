import { Lock } from 'lucide-react';

export default function ClosedDayBanner({ date, closedBy, closedAt }) {
  return (
    <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700">
        <Lock className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-black text-emerald-950 tracking-tight">Day Locked & Closed</h2>
      <p className="text-slate-600 text-xs font-medium">
        All records for {new Date(date).toLocaleDateString()} finalized
        {closedBy?.name && ` by ${closedBy.name}`}
        {closedAt && ` at ${new Date(closedAt).toLocaleTimeString()}`}.
      </p>
    </div>
  );
}
