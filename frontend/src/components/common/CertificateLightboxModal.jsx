import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  ShieldCheck, 
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Move
} from 'lucide-react';
import { getPdfDocument, renderPdfToCanvas } from '../../utils/pdfViewerHelper';

export default function CertificateLightboxModal({
  certificates = [],
  activeIdx = null,
  onClose,
  onSelectIdx
}) {
  const currentCert = activeIdx !== null && certificates[activeIdx] ? certificates[activeIdx] : null;

  // Zoom & Pan State
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState('page'); // 'page' (overview) | 'width' (high-res reading)
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const viewportRef = useRef(null);

  // High-DPI Vector Canvas State
  const canvasRef = useRef(null);
  const activeRenderTaskRef = useRef(null);
  const [isVectorPdfLoaded, setIsVectorPdfLoaded] = useState(false);
  const [isPdfRendering, setIsPdfRendering] = useState(false);

  // Reset zoom & scroll position whenever active document changes
  useEffect(() => {
    setZoom(1);
    setFitMode('page');
    setIsVectorPdfLoaded(false);
    if (viewportRef.current) {
      viewportRef.current.scrollLeft = 0;
      viewportRef.current.scrollTop = 0;
    }
  }, [activeIdx]);

  // Dynamic High-DPI PDF Vector Rendering Effect
  useEffect(() => {
    let isCancelled = false;
    setIsVectorPdfLoaded(false);

    if (activeRenderTaskRef.current) {
      activeRenderTaskRef.current.cancel();
      activeRenderTaskRef.current = null;
    }

    if (!currentCert?.pdfUrl) {
      setIsPdfRendering(false);
      return;
    }

    setIsPdfRendering(true);

    // Safety auto-dismiss: Vector loading badge must NEVER persist longer than 2.5s
    const safetyTimer = setTimeout(() => {
      if (!isCancelled) {
        setIsPdfRendering(false);
      }
    }, 2500);

    const renderTimer = setTimeout(async () => {
      try {
        const pdfDoc = await getPdfDocument(currentCert.pdfUrl);
        if (isCancelled || !pdfDoc || !canvasRef.current) {
          if (!isCancelled) setIsPdfRendering(false);
          return;
        }

        const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
        const winHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
        // Cap DPR to 2.0 on mobile to protect mobile GPU buffer; on desktop use at least 2.0
        const dpr = winWidth < 640 
          ? Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2.0)
          : Math.max(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2.0);

        let targetWidth = null;
        let targetHeight = null;

        if (fitMode === 'width') {
          targetWidth = Math.min(winWidth - (winWidth < 640 ? 16 : 48), 980) * zoom;
        } else {
          targetHeight = Math.max(winHeight - (winWidth < 640 ? 160 : 210), 320) * zoom;
        }

        const task = await renderPdfToCanvas({
          pdfDoc,
          pageNum: 1,
          canvas: canvasRef.current,
          targetWidth,
          targetHeight,
          dpr
        });

        if (isCancelled || !task) {
          if (!isCancelled) setIsPdfRendering(false);
          return;
        }

        activeRenderTaskRef.current = task;
        
        // Timeout rendering to avoid blocking if GPU canvas is slow
        const renderTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Vector rendering timeout')), 2500)
        );
        await Promise.race([task.promise, renderTimeout]);

        if (!isCancelled) {
          setIsVectorPdfLoaded(true);
        }
      } catch (_err) {
        // Silently fallback to the crisp 300 DPI preview image
      } finally {
        if (!isCancelled) {
          setIsPdfRendering(false);
        }
      }
    }, 40);

    return () => {
      isCancelled = true;
      clearTimeout(renderTimer);
      clearTimeout(safetyTimer);
      if (activeRenderTaskRef.current) {
        activeRenderTaskRef.current.cancel();
        activeRenderTaskRef.current = null;
      }
    };
  }, [currentCert?.pdfUrl, activeIdx, zoom, fitMode]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(3.0, Number((prev + 0.25).toFixed(2))));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(0.5, Number((prev - 0.25).toFixed(2))));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setFitMode('page');
    if (viewportRef.current) {
      viewportRef.current.scrollLeft = 0;
      viewportRef.current.scrollTop = 0;
    }
  }, []);

  const toggleFitMode = useCallback(() => {
    setFitMode((prev) => {
      const next = prev === 'page' ? 'width' : 'page';
      setZoom(1);
      return next;
    });
    if (viewportRef.current) {
      viewportRef.current.scrollLeft = 0;
      viewportRef.current.scrollTop = 0;
    }
  }, []);

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (activeIdx === null) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      // Zoom shortcuts
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      }
      if (e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      }
      // Fit mode shortcut ('f' or 'w')
      if ((e.key === 'f' || e.key === 'F' || e.key === 'w' || e.key === 'W') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleFitMode();
      }
      // Document navigation
      if (e.key === 'ArrowRight' && !e.ctrlKey && !e.shiftKey) {
        onSelectIdx((activeIdx + 1) % certificates.length);
      }
      if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.shiftKey) {
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
  }, [activeIdx, certificates.length, onClose, onSelectIdx, handleZoomIn, handleZoomOut, handleResetZoom, toggleFitMode]);

  // Mouse wheel zoom when holding Ctrl / Meta
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      setZoom((prev) => Math.min(3.0, Math.max(0.5, Number((prev + delta).toFixed(2)))));
    }
  };

  // Drag-to-pan logic for mouse
  const handleMouseDown = (e) => {
    if (!viewportRef.current) return;
    if (e.target.closest('button') || e.target.closest('a')) return;

    const { scrollWidth, clientWidth, scrollHeight, clientHeight } = viewportRef.current;
    const canScroll = scrollWidth > clientWidth || scrollHeight > clientHeight;
    if (!canScroll && zoom === 1 && fitMode === 'page') return;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop
    };
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !viewportRef.current) return;
    e.preventDefault();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    viewportRef.current.scrollLeft = dragStartRef.current.scrollLeft - dx;
    viewportRef.current.scrollTop = dragStartRef.current.scrollTop - dy;
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Double click to toggle between Fit Page and Fit Width / Zoom
  const handleDoubleClick = (e) => {
    if (e.target.closest('button') || e.target.closest('a')) return;
    if (fitMode === 'page' && zoom === 1) {
      setFitMode('width');
      setZoom(1.35);
    } else {
      setFitMode('page');
      setZoom(1);
    }
  };

  if (!currentCert) return null;

  const hasMultiple = certificates.length > 1;
  const isOverflowing = zoom > 1 || fitMode === 'width';

  // Compute image style based on fitMode and zoom
  const getImageStyle = () => {
    if (fitMode === 'page') {
      if (zoom === 1) {
        return {
          maxHeight: 'calc(100dvh - 210px)',
          maxWidth: '100%',
          width: 'auto',
          height: 'auto'
        };
      }
      return {
        maxHeight: `calc((100dvh - 210px) * ${zoom})`,
        maxWidth: 'none',
        width: 'auto',
        height: 'auto'
      };
    }

    // fitMode === 'width': expands to full crisp reading width
    if (zoom === 1) {
      return {
        width: 'min(calc(100vw - 24px), 980px)',
        maxWidth: 'none',
        height: 'auto'
      };
    }
    return {
      width: `calc(min(calc(100vw - 24px), 980px) * ${zoom})`,
      maxWidth: 'none',
      height: 'auto'
    };
  };

  return (
    <div
      className="fixed inset-0 z-[99999] bg-slate-950/90 backdrop-blur-md flex flex-col justify-between overflow-hidden animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={`Certificate viewer: ${currentCert.title}`}
    >
      {/* Top Bar with Integrated Zoom & View Toolbar */}
      <div className="relative z-20 flex items-center justify-between px-3 sm:px-8 py-3 bg-slate-950/95 border-b border-slate-800 shrink-0 gap-2">
        {/* Left: Badge & Counter */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 rounded-none shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{currentCert.badge || 'Verified'}</span>
          </span>
          {isVectorPdfLoaded && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 rounded-none shrink-0">
              HD Vector
            </span>
          )}
          {hasMultiple && (
            <span className="text-xs font-semibold text-slate-400 truncate hidden md:inline">
              Document {activeIdx + 1} of {certificates.length}
            </span>
          )}
        </div>

        {/* Center: Zoom, Fit & Horizontal Scroll Controls (Adhering to existing UI) */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-900 border border-slate-700 p-1 shadow-lg">
          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="w-7 sm:w-8 h-7 sm:h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Zoom Out (-)"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Zoom Percentage (Click to reset) */}
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-1.5 sm:px-2.5 h-7 sm:h-8 flex items-center justify-center text-xs font-mono font-bold text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer min-w-[48px] sm:min-w-[56px]"
            title="Click to reset zoom (100%)"
          >
            {Math.round(zoom * 100)}%
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 3.0}
            className="w-7 sm:w-8 h-7 sm:h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Zoom In (+)"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-0.5" />

          {/* Fit Mode Toggle: Fit Width (Read document) vs Fit Page (Overview) */}
          <button
            type="button"
            onClick={toggleFitMode}
            className={`px-2 sm:px-2.5 h-7 sm:h-8 flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer border ${
              fitMode === 'width'
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/80'
                : 'text-slate-300 hover:text-white hover:bg-slate-800 border-transparent'
            }`}
            title={fitMode === 'width' ? "Switch to Fit Page Overview" : "Fit Page Width (High Resolution Reading)"}
          >
            {fitMode === 'width' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{fitMode === 'width' ? 'Fit Page' : 'Fit Width'}</span>
          </button>

          {/* Reset View */}
          <button
            type="button"
            onClick={handleResetZoom}
            className="w-7 sm:w-8 h-7 sm:h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Reset Zoom & Alignment (0)"
            aria-label="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-9 sm:w-10 h-9 sm:h-10 flex items-center justify-center bg-slate-800 hover:bg-rose-950/80 hover:text-rose-400 hover:border-rose-700/70 text-white rounded-none border border-slate-700 transition-all cursor-pointer shrink-0"
          aria-label="Close certificate viewer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Floating Prev Navigation Button */}
      {hasMultiple && (
        <button
          type="button"
          onClick={() => onSelectIdx((activeIdx - 1 + certificates.length) % certificates.length)}
          className="fixed left-2 sm:left-6 top-1/2 -translate-y-1/2 z-40 w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center bg-slate-900/95 hover:bg-cyan-600 text-white rounded-none border border-slate-700 transition-all cursor-pointer shadow-2xl hover:scale-105"
          aria-label="Previous certificate"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Floating Next Navigation Button */}
      {hasMultiple && (
        <button
          type="button"
          onClick={() => onSelectIdx((activeIdx + 1) % certificates.length)}
          className="fixed right-2 sm:right-6 top-1/2 -translate-y-1/2 z-40 w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center bg-slate-900/95 hover:bg-cyan-600 text-white rounded-none border border-slate-700 transition-all cursor-pointer shadow-2xl hover:scale-105"
          aria-label="Next certificate"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Main Interactive Stage with Horizontal & Vertical Scrolling */}
      <div
        ref={viewportRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        className={`relative z-10 flex-1 w-full overflow-auto p-4 sm:p-8 flex touch-pan-x touch-pan-y ${
          isOverflowing ? 'items-start justify-center' : 'items-center justify-center'
        } ${isDragging ? 'cursor-grabbing select-none' : isOverflowing ? 'cursor-grab' : 'cursor-zoom-in'} 
        scrollbar-thin [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar]:h-2.5 
        [&::-webkit-scrollbar-thumb]:bg-slate-700/90 [&::-webkit-scrollbar-thumb]:hover:bg-cyan-600 
        [&::-webkit-scrollbar-track]:bg-slate-950/60`}
        style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
      >
        <div 
          className="relative bg-white shadow-2xl border border-slate-700 shrink-0 transition-size duration-150 ease-out select-none flex items-center justify-center overflow-hidden"
          style={getImageStyle()}
        >
          {/* 1. Instant High-Res 300 DPI Preview Image */}
          <img
            src={currentCert.image}
            alt={currentCert.title}
            style={{
              imageRendering: '-webkit-optimize-contrast',
              ...(!isVectorPdfLoaded ? getImageStyle() : {})
            }}
            className={`object-contain select-none pointer-events-none transition-opacity duration-200 ${
              isVectorPdfLoaded ? 'hidden' : 'block opacity-100'
            }`}
            loading="eager"
            draggable={false}
          />

          {/* 2. Razor-Sharp Vector PDF Canvas */}
          {currentCert.pdfUrl && (
            <canvas
              ref={canvasRef}
              style={{
                imageRendering: '-webkit-optimize-contrast',
                ...(isVectorPdfLoaded ? getImageStyle() : {})
              }}
              className={`object-contain select-none pointer-events-none transition-opacity duration-200 ${
                isVectorPdfLoaded ? 'block opacity-100' : 'hidden'
              }`}
            />
          )}

          {/* Vector rendering indicator */}
          {isPdfRendering && !isVectorPdfLoaded && (
            <div className="absolute top-3 right-3 pointer-events-none z-20">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-cyan-300 bg-slate-950/85 border border-cyan-800/80 backdrop-blur-md shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>Loading HD Vector...</span>
              </span>
            </div>
          )}
        </div>

        {/* Floating Non-Intrusive Pan & Scroll Navigation Guide (Hidden on mobile) */}
        {isOverflowing && (
          <div className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-slate-950/80 backdrop-blur-md border border-slate-700 text-slate-300 text-[11px] font-medium px-3 py-1.5 shadow-xl hidden sm:flex items-center gap-2">
            <Move className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Drag to pan · Scroll horizontally & vertically · Double-click to toggle fit</span>
          </div>
        )}
      </div>

      {/* Bottom Metadata & Download Action Footer */}
      <div className="relative z-20 bg-slate-950/95 border-t border-slate-800 px-4 sm:px-8 py-3.5 sm:py-4 shrink-0">
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
