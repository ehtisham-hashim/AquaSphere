import { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const PRESET_OPTIONS = [
  { id: 'this-month', label: 'This Month' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this-week', label: 'This Week' },
  { id: 'last-week', label: 'Last Week' },
  { id: 'last-7-days', label: 'Last 7 Days' },
  { id: 'last-30-days', label: 'Last 30 Days' },
  { id: 'last-month', label: 'Last Month' },
  { id: 'this-year', label: 'This Year' },
  { id: 'custom', label: 'Custom' }
];

const WEEKDAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * Formats a Date object to YYYY-MM-DD
 */
function formatDateISO(d) {
  if (!d || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Formats a Date object or YYYY-MM-DD string to MM/DD/YYYY
 */
function formatDateDisplay(val) {
  if (!val) return '';
  const d = typeof val === 'string' ? new Date(val + 'T00:00:00') : val;
  if (isNaN(d.getTime())) return '';
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const y = d.getFullYear();
  return `${m}/${day}/${y}`;
}

/**
 * Parses MM/DD/YYYY to YYYY-MM-DD
 */
function parseDateDisplay(str) {
  if (!str) return '';
  const parts = str.split('/');
  if (parts.length === 3) {
    const [m, d, y] = parts;
    if (m && d && y && y.length === 4) {
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  return str;
}

/**
 * Calculates start and end ISO dates for predefined presets
 */
function getPresetRange(presetId) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const dayOfWeek = now.getDay(); // 0 is Sun

  switch (presetId) {
    case 'today': {
      const todayIso = formatDateISO(now);
      return { start: todayIso, end: todayIso };
    }
    case 'yesterday': {
      const yDate = new Date(y, m, d - 1);
      const yIso = formatDateISO(yDate);
      return { start: yIso, end: yIso };
    }
    case 'this-week': {
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(y, m, d + mondayOffset);
      return { start: formatDateISO(monday), end: formatDateISO(now) };
    }
    case 'last-week': {
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const lastMon = new Date(y, m, d + mondayOffset - 7);
      const lastSun = new Date(y, m, d + mondayOffset - 1);
      return { start: formatDateISO(lastMon), end: formatDateISO(lastSun) };
    }
    case 'last-7-days': {
      const start7 = new Date(y, m, d - 6);
      return { start: formatDateISO(start7), end: formatDateISO(now) };
    }
    case 'last-30-days': {
      const start30 = new Date(y, m, d - 29);
      return { start: formatDateISO(start30), end: formatDateISO(now) };
    }
    case 'this-month': {
      const startMonth = new Date(y, m, 1);
      const endMonth = new Date(y, m + 1, 0);
      return { start: formatDateISO(startMonth), end: formatDateISO(endMonth) };
    }
    case 'last-month': {
      const startPrev = new Date(y, m - 1, 1);
      const endPrev = new Date(y, m, 0);
      return { start: formatDateISO(startPrev), end: formatDateISO(endPrev) };
    }
    case 'this-year': {
      const startYear = new Date(y, 0, 1);
      const endYear = new Date(y, 11, 31);
      return { start: formatDateISO(startYear), end: formatDateISO(endYear) };
    }
    default:
      return null;
  }
}

export default function DateRangePicker({
  startDate = '',
  endDate = '',
  onChange,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Staged state inside popover
  const [stagedStart, setStagedStart] = useState(startDate);
  const [stagedEnd, setStagedEnd] = useState(endDate);
  const [selectedPreset, setSelectedPreset] = useState('this-month');

  // Month being viewed on the interactive calendar
  const [viewYear, setViewYear] = useState(() => {
    if (startDate) {
      const d = new Date(startDate + 'T00:00:00');
      if (!isNaN(d.getTime())) return d.getFullYear();
    }
    return new Date().getFullYear();
  });

  const [viewMonth, setViewMonth] = useState(() => {
    if (startDate) {
      const d = new Date(startDate + 'T00:00:00');
      if (!isNaN(d.getTime())) return d.getMonth();
    }
    return new Date().getMonth();
  });

  // Synchronize when outer props change
  useEffect(() => {
    setStagedStart(startDate);
    setStagedEnd(endDate);
    if (startDate) {
      const d = new Date(startDate + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [startDate, endDate]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setStagedStart(startDate);
        setStagedEnd(endDate);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, startDate, endDate]);

  // Handle preset selection
  const handlePresetChange = (presetId) => {
    setSelectedPreset(presetId);
    if (presetId === 'custom') return;
    const range = getPresetRange(presetId);
    if (range) {
      setStagedStart(range.start);
      setStagedEnd(range.end);
      const d = new Date(range.start + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  };

  // Calendar month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(v => v - 1);
      setViewMonth(11);
    } else {
      setViewMonth(v => v - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(v => v + 1);
      setViewMonth(0);
    } else {
      setViewMonth(v => v + 1);
    }
  };

  // Handle clicking a day cell on the calendar
  const handleDayClick = (dayIso) => {
    setSelectedPreset('custom');
    if (!stagedStart || (stagedStart && stagedEnd)) {
      setStagedStart(dayIso);
      setStagedEnd('');
    } else if (stagedStart && !stagedEnd) {
      if (dayIso < stagedStart) {
        setStagedStart(dayIso);
        setStagedEnd(stagedStart);
      } else {
        setStagedEnd(dayIso);
      }
    }
  };

  // Apply staged dates
  const handleApply = () => {
    const finalStart = stagedStart || stagedEnd || formatDateISO(new Date());
    const finalEnd = stagedEnd || stagedStart || formatDateISO(new Date());
    const sortedStart = finalStart <= finalEnd ? finalStart : finalEnd;
    const sortedEnd = finalStart <= finalEnd ? finalEnd : finalStart;

    if (onChange) {
      onChange({
        startDate: sortedStart,
        endDate: sortedEnd,
        preset: selectedPreset
      });
    }
    setIsOpen(false);
  };

  // Cancel staged dates
  const handleCancel = () => {
    setStagedStart(startDate);
    setStagedEnd(endDate);
    setIsOpen(false);
  };

  // Calendar matrix calculation for the viewed month
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sun
    const daysInMonth = lastDayOfMonth.getDate();

    const days = [];

    // Prev month padding days
    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const pMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const pDay = prevMonthLastDay - i;
      const iso = formatDateISO(new Date(pYear, pMonth, pDay));
      days.push({ dayNumber: pDay, iso, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = formatDateISO(new Date(viewYear, viewMonth, d));
      days.push({ dayNumber: d, iso, isCurrentMonth: true });
    }

    // Next month padding days to fill grid cleanly
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      const nMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const iso = formatDateISO(new Date(nYear, nMonth, d));
      days.push({ dayNumber: d, iso, isCurrentMonth: false });
    }

    return days;
  }, [viewYear, viewMonth]);

  const viewMonthName = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).toLocaleString('default', { month: 'long' });
  }, [viewYear, viewMonth]);

  // Trigger input label text
  const triggerLabel = useMemo(() => {
    if (startDate && endDate) {
      if (startDate === endDate) return formatDateDisplay(startDate);
      return `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`;
    }
    if (startDate) return formatDateDisplay(startDate);
    return 'Select Date Range';
  }, [startDate, endDate]);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200/90 hover:border-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-2xs hover:bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-brand/20 active:scale-98"
      >
        <CalendarIcon className="w-3.5 h-3.5 text-brand shrink-0" />
        <span className="font-mono tracking-tight text-slate-700">{triggerLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Dropdown (Right-aligned to avoid screen cut-off) */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-4 w-[95vw] sm:w-[500px] max-w-[500px] animate-in fade-in zoom-in-95 duration-150">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* LEFT COLUMN: Interactive Calendar (Fixed Width) */}
            <div className="w-full sm:w-[260px] shrink-0">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-2 px-0.5">
                <span className="font-bold text-sm text-slate-800">
                  {viewMonthName} {viewYear}
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    aria-label="Previous Month"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    aria-label="Next Month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Weekday Labels */}
              <div className="grid grid-cols-7 gap-0 text-center mb-1">
                {WEEKDAY_NAMES.map(day => (
                  <div key={day} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {calendarDays.map((cell, idx) => {
                  const isStart = cell.iso === stagedStart;
                  const isEnd = cell.iso === stagedEnd;
                  const isInRange = stagedStart && stagedEnd && cell.iso > stagedStart && cell.iso < stagedEnd;

                  return (
                    <div key={idx} className="relative flex items-center justify-center h-8">
                      {/* Range band background strip */}
                      {isInRange && (
                        <div className="absolute inset-y-1 inset-x-0 bg-brand-light" />
                      )}
                      {isStart && stagedEnd && stagedStart !== stagedEnd && (
                        <div className="absolute inset-y-1 right-0 left-1/2 bg-brand-light" />
                      )}
                      {isEnd && stagedStart && stagedStart !== stagedEnd && (
                        <div className="absolute inset-y-1 left-0 right-1/2 bg-brand-light" />
                      )}

                      {/* Day Button */}
                      <button
                        type="button"
                        onClick={() => handleDayClick(cell.iso)}
                        className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                          isStart || isEnd
                            ? 'bg-brand text-white font-bold shadow-xs'
                            : isInRange
                            ? 'text-brand font-semibold hover:bg-brand/20'
                            : cell.isCurrentMonth
                            ? 'text-slate-700 hover:bg-slate-100'
                            : 'text-slate-300 hover:text-slate-500'
                        }`}
                      >
                        {cell.dayNumber}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT COLUMN: Preset Selector, Range Inputs, Action Buttons */}
            <div className="w-full sm:w-[200px] shrink-0 flex flex-col justify-between border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-4 space-y-2.5">
              <div className="space-y-2.5">
                {/* Presets Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Date range
                  </label>
                  <select
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 outline-none focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand/30"
                  >
                    {PRESET_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Date Manual Input */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Start
                  </label>
                  <input
                    type="text"
                    placeholder="MM/DD/YYYY"
                    value={formatDateDisplay(stagedStart)}
                    onChange={(e) => {
                      setSelectedPreset('custom');
                      const parsed = parseDateDisplay(e.target.value);
                      setStagedStart(parsed);
                    }}
                    className="w-full text-xs font-medium font-mono bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 outline-none focus:border-brand focus:bg-white"
                  />
                </div>

                {/* End Date Manual Input */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    End
                  </label>
                  <input
                    type="text"
                    placeholder="MM/DD/YYYY"
                    value={formatDateDisplay(stagedEnd)}
                    onChange={(e) => {
                      setSelectedPreset('custom');
                      const parsed = parseDateDisplay(e.target.value);
                      setStagedEnd(parsed);
                    }}
                    className="w-full text-xs font-medium font-mono bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 outline-none focus:border-brand focus:bg-white"
                  />
                </div>
              </div>

              {/* Action Buttons: Apply & Cancel */}
              <div className="pt-1 space-y-1.5">
                <button
                  type="button"
                  onClick={handleApply}
                  className="btn-primary w-full py-1.5 text-xs font-bold shadow-xs"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn-secondary w-full py-1.5 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
