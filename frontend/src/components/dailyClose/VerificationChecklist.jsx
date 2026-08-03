import { useState } from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

// ponytail: manages own checkbox state, parent just passes items + onConfirm
export default function VerificationChecklist({ title, subtitle, items, onConfirm, confirmLabel = 'Confirm', confirmIcon: ConfirmIcon = ShieldCheck, confirmed, confirmedBy, submitting, disabled }) {
  const [checks, setChecks] = useState(() => Object.fromEntries(items.map(i => [i.key, false])));
  const allChecked = Object.values(checks).every(Boolean);

  if (confirmed) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
        <p className="text-sm font-bold text-emerald-900">{title} — Verified ✓</p>
        {confirmedBy && <p className="text-xs text-emerald-700">by {confirmedBy}</p>}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="space-y-3">
        {items.map(item => (
          <label key={item.key} className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={checks[item.key] || false}
              onChange={e => setChecks(prev => ({ ...prev, [item.key]: e.target.checked }))}
              className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <span className="text-xs text-slate-800 font-semibold group-hover:text-emerald-700">{item.label}</span>
          </label>
        ))}
      </div>
      <button
        onClick={onConfirm}
        disabled={!allChecked || submitting || disabled}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2"
      >
        <ConfirmIcon size={16} />
        {submitting ? 'Processing...' : confirmLabel}
      </button>
    </div>
  );
}
