import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ShieldCheck, ExternalLink } from 'lucide-react';

export default function CertificateLightboxModal({
  certificates = [],
  activeIdx = null,
  onClose,
  onSelectIdx
}) {
  const currentCert = activeIdx !== null && certificates[activeIdx] ? certificates[activeIdx] : null;

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (activeIdx === null) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        onSelectIdx((activeIdx + 1) % certificates.length);
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        onSelectIdx((activeIdx - 1 + certificates.length) % certificates.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [activeIdx, certificates.length, onClose, onSelectIdx]);

  if (!currentCert) return null;

  const hasMultiple = certificates.length > 1;

  return (
    <div
      className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex flex-col justify-between overflow-hidden animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={`Certificate viewer: ${currentCert.title}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Bar */}
      <div className="relative z-20 flex items-center justify-between px-4 sm:px-8 py-4 bg-slate-950/60 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 rounded-none">
            <ShieldCheck className="w-3.5 h-3.5" />
            {currentCert.badge || 'Verified'}
          </span>
          {hasMultiple && (
            <span className="text-xs font-semibold text-slate-400">
              Document {activeIdx + 1} of {certificates.length}
            </span>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded-none border border-slate-700 transition-all cursor-pointer"
          aria-label="Close certificate viewer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Preview Stage with Navigation Arrows */}
      <div 
        className="relative z-10 flex-1 flex items-center justify-between p-3 sm:p-6 overflow-hidden max-w-7xl w-full mx-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Prev Arrow */}
        {hasMultiple ? (
          <button
            type="button"
            onClick={() => onSelectIdx((activeIdx - 1 + certificates.length) % certificates.length)}
            className="w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center bg-slate-900/90 hover:bg-cyan-600 text-white rounded-none border border-slate-700 transition-all shrink-0 cursor-pointer shadow-xl z-20"
            aria-label="Previous certificate"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        ) : <div className="w-10" />}

        {/* Certificate Image Frame */}
        <div className="flex-1 flex items-center justify-center max-h-[calc(100vh-210px)] px-2 sm:px-6">
          <div className="relative bg-white shadow-2xl border border-slate-700 max-h-[calc(100vh-220px)] flex items-center justify-center overflow-hidden">
            <img
              src={currentCert.image}
              alt={currentCert.title}
              className="max-h-[calc(100vh-230px)] max-w-full object-contain select-none"
              loading="eager"
            />
          </div>
        </div>

        {/* Next Arrow */}
        {hasMultiple ? (
          <button
            type="button"
            onClick={() => onSelectIdx((activeIdx + 1) % certificates.length)}
            className="w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center bg-slate-900/90 hover:bg-cyan-600 text-white rounded-none border border-slate-700 transition-all shrink-0 cursor-pointer shadow-xl z-20"
            aria-label="Next certificate"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        ) : <div className="w-10" />}
      </div>

      {/* Bottom Metadata & Download Action Footer */}
      <div className="relative z-20 bg-slate-950/90 border-t border-slate-800 px-4 sm:px-8 py-3.5 sm:py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h3 className="text-base sm:text-lg font-bold text-white truncate">
                {currentCert.title}
              </h3>
              <span className="text-xs px-2 py-0.5 bg-slate-800 text-cyan-300 font-semibold border border-slate-700 rounded-none">
                {currentCert.validity}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 truncate">
              <span className="text-slate-300 font-medium">{currentCert.authority}</span>
              {currentCert.number && ` · ${currentCert.number}`}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            {currentCert.pdfUrl && (
              <>
                <a
                  href={currentCert.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold rounded-none border border-slate-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Open PDF</span>
                </a>
                <a
                  href={currentCert.pdfUrl}
                  download
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs sm:text-sm font-bold rounded-none shadow-md transition-all"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>Download PDF</span>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
