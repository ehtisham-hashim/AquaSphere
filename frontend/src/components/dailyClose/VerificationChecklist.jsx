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
    <div className="card-surface p-4 sm:p-5 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="space-y-2.5">
        {items.map(item => (
          <label key={item.key} className="flex items-start gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={checks[item.key] || false}
              onChange={e => setChecks(prev => ({ ...prev, [item.key]: e.target.checked }))}
              className="mt-0.5 w-4 h-4 text-brand-primary rounded border-slate-300 focus:ring-brand-primary"
            />
            <span className="text-xs text-slate-700 font-medium group-hover:text-brand-primary transition-colors">{item.label}</span>
          </label>
        ))}
      </div>
      <button
        onClick={onConfirm}
        disabled={!allChecked || submitting || disabled}
        className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-1.5"
      >
        <ConfirmIcon size={14} />
        {submitting ? 'Processing...' : confirmLabel}
      </button>
    </div>
  );
}
