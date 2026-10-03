/* eslint-disable react-refresh/only-export-components */
import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';

export const DEFAULT_OPTIONS = [
  { value: '1_MONTH', label: 'This Month' },
  { value: 'TODAY', label: 'Today' },
  { value: 'YESTERDAY', label: 'Yesterday' },
  { value: 'LAST_3_DAYS', label: 'Last 3 Days' },
  { value: '1_WEEK', label: 'This Week' },
  { value: '1_YEAR', label: 'This Year' }
];

export default function TimeframeDropdown({ 
  value = '1_MONTH', 
  onChange, 
  options = DEFAULT_OPTIONS,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find(o => o.value === value)
    || (value === 'MONTHLY' ? options.find(o => o.value === '1_MONTH') : null)
    || (value === 'DAILY' ? options.find(o => o.value === 'TODAY') : null)
    || (value === 'YEARLY' ? options.find(o => o.value === '1_YEAR') : null)
    || (value === '1_MONTH' ? options.find(o => o.value === 'MONTHLY') : null)
    || (value === 'TODAY' ? options.find(o => o.value === 'DAILY') : null)
    || (value === '1_YEAR' ? options.find(o => o.value === 'YEARLY') : null)
    || options[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20 active:scale-98"
      >
        <Calendar className="w-3.5 h-3.5 text-brand-primary shrink-0" />
        <span>{selectedOption.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-colors ${
                  isSelected 
                    ? 'bg-brand-muted text-brand-primary font-bold' 
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-brand-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
