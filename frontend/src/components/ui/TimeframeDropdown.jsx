import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';

const DEFAULT_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'YEARLY', label: 'Yearly' }
];

export default function TimeframeDropdown({ 
  value = 'MONTHLY', 
  onChange, 
  options = DEFAULT_OPTIONS,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find(o => o.value === value) || options[0];

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
