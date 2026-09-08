import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className={`bg-white rounded-xl border border-slate-200/90 shadow-xl w-full ${maxWidth} overflow-hidden animate-in zoom-in-95 duration-150`}>
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">{title}</h3>
            {onClose && (
              <button 
                onClick={onClose} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        <div className="p-4 sm:p-5 max-h-[85vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
