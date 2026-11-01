import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

/**
 * Reusable Multi-Select Checkbox Dropdown Popover
 * Clean trigger button with active count badge; popover list with individual checkboxes
 * and Select All / Clear All controls.
 */
export default function MultiSelectDropdown({
  label = 'Filter',
  icon: Icon = null,
  options = [],
  selectedValues = [],
  onChange,
  className = '',
  emptyLabel = 'All'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const hasSelections = selectedValues.length > 0;
  const isAllSelected = options.length > 0 && selectedValues.length === options.length;

  const handleToggleOption = (val) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(options.map(o => o.value));
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all select-none ${
          hasSelections
            ? 'bg-brand/10 border-brand/40 text-brand shadow-2xs font-bold'
            : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs'
        }`}
      >
        {Icon && <Icon size={14} className={hasSelections ? 'text-brand' : 'text-slate-400'} />}
        <span>{label}</span>
        {hasSelections ? (
          <span className="inline-flex items-center justify-center bg-brand text-white text-[10px] font-bold h-4 min-w-[16px] px-1 rounded-full">
            {selectedValues.length}
          </span>
        ) : (
          <span className="text-slate-400 font-normal">({emptyLabel})</span>
        )}
        {hasSelections ? (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClear(e); }}
            className="hover:bg-brand/20 p-0.5 rounded-full text-brand transition-colors ml-0.5"
            title="Clear filter"
          >
            <X size={12} />
          </span>
        ) : (
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white border border-slate-200/90 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header Controls */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-600 uppercase tracking-wider">{label}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-brand hover:underline font-semibold"
              >
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </button>
              {hasSelections && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-slate-400 hover:text-rose-600 font-semibold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
            {options.map((opt) => {
              const checked = selectedValues.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition-colors select-none ${
                    checked
                      ? 'bg-brand/10 text-brand font-semibold'
                      : 'hover:bg-slate-100/80 text-slate-700'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleOption(opt.value);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        checked
                          ? 'bg-brand border-brand text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {checked && <Check size={11} strokeWidth={3} />}
                    </div>
                    <span>{opt.label}</span>
                  </div>
                  {opt.badge !== undefined && (
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-full font-mono">
                      {opt.badge}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
