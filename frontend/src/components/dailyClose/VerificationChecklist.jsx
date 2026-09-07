import { useState } from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

// ponytail: manages own checkbox state, robust prop handling so it never crashes
export default function VerificationChecklist({
  title = 'Daily Verification',
  subtitle,
  items,
  checklist,
  onConfirm,
  confirmLabel = 'Confirm',
  confirmRole,
  confirmIcon: ConfirmIcon = ShieldCheck,
  confirmed,
  isConfirmed,
  confirmedBy,
  submitting,
  disabled,
  confirmDisabled
}) {
  const actualItems = Array.isArray(items) ? items : (Array.isArray(checklist) ? checklist : []);
  const isActuallyConfirmed = Boolean(confirmed ?? isConfirmed);
  const isDisabled = Boolean(disabled ?? confirmDisabled);
  const buttonLabel = confirmRole ? `Confirm ${confirmRole} Close` : confirmLabel;

  const [checks, setChecks] = useState(() => Object.fromEntries(actualItems.map(i => [i.key, false])));
  const allChecked = actualItems.length > 0 && Object.values(checks).every(Boolean);

  const formatConfirmedBy = (by) => {
    if (!by) return null;
    if (typeof by === 'object') return by.name || 'Manager';
    return String(by);
  };

  if (isActuallyConfirmed) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
        <p className="text-sm font-bold text-emerald-900">{title} — Verified ✓</p>
        {confirmedBy && <p className="text-xs text-emerald-700">by {formatConfirmedBy(confirmedBy)}</p>}
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
        {actualItems.map(item => (
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
        disabled={!allChecked || submitting || isDisabled}
        className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ConfirmIcon size={14} />
        {submitting ? 'Processing...' : buttonLabel}
      </button>
    </div>
  );
}
