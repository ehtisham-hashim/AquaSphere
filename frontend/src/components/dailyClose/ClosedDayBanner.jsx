import { Lock } from 'lucide-react';

export default function ClosedDayBanner({ date, closedBy, closedAt }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-3">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
        <Lock className="w-8 h-8 text-emerald-600" />
      </div>
      <h2 className="text-2xl font-bold text-emerald-900">Day Locked & Closed</h2>
      <p className="text-slate-600 text-sm">
        All records for {new Date(date).toLocaleDateString()} finalized
        {closedBy?.name && ` by ${closedBy.name}`}
        {closedAt && ` at ${new Date(closedAt).toLocaleTimeString()}`}.
      </p>
    </div>
  );
}
