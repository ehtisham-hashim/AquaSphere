import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export default function TableActionMenu({
  items = [],
  align = 'right',
  triggerClassName = '',
  triggerTitle = 'More options',
  iconSize = 15,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, placement: 'bottom' });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  // Filter out falsy or hidden items
  const visibleItems = items.filter(item => Boolean(item) && !item.hidden);

  const calculatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 200;
    const menuEstimatedHeight = Math.min(visibleItems.length * 36 + 16, 260);

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < menuEstimatedHeight && spaceAbove > spaceBelow;

    const top = openUpward ? rect.top - 4 : rect.bottom + 4;
    let left = align === 'left' ? rect.left : rect.right - menuWidth;

    // Viewport edge collision protection
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }

    setCoords({
      top,
      left,
      placement: openUpward ? 'top' : 'bottom',
    });
  }, [align, visibleItems.length]);

  const toggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOpen) {
      calculatePosition();
    }
    setIsOpen(prev => !prev);
  };

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Recalculate on open
  useEffect(() => {
    if (isOpen) {
      calculatePosition();
    }
  }, [isOpen, calculatePosition]);

  // Handle outside click, escape, and scroll dismiss
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        closeMenu();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };

    // Close on any container scroll to prevent detached floating menus
    const handleScroll = (e) => {
      // Don't close if scrolling inside the menu itself
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      closeMenu();
    };

    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', closeMenu);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [isOpen, closeMenu]);

  // Don't render anything if no items exist
  if (visibleItems.length === 0) return null;

  return (
    <div className="relative inline-flex items-center" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        title={triggerTitle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-1 focus:ring-slate-300 cursor-pointer ${
          isOpen ? 'bg-slate-100 text-slate-700' : ''
        } ${triggerClassName}`}
      >
        <MoreVertical size={iconSize} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            transform: coords.placement === 'top' ? 'translateY(-100%)' : 'none',
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="fixed z-[9999] w-48 sm:w-52 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 text-xs font-medium text-slate-700 animate-in fade-in zoom-in-95 duration-100 select-none overflow-hidden"
        >
          {visibleItems.map((item, idx) => {
            if (item.divider) {
              return (
                <div key={`divider-${idx}`} className="my-1 border-t border-slate-100" role="separator" />
              );
            }

            const Icon = item.icon;
            const isDanger = item.variant === 'danger';

            return (
              <button
                key={item.label || idx}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (item.disabled) return;
                  closeMenu();
                  if (item.onClick) item.onClick(e);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isDanger
                    ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {Icon && (
                  <Icon
                    size={14}
                    className={`shrink-0 ${
                      isDanger ? 'text-rose-500' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                )}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
