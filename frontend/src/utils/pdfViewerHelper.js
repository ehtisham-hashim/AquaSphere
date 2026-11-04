import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker using Vite asset URL resolution with unpkg fallback
if (typeof window !== 'undefined' && pdfjsLib?.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.4.299'}/build/pdf.worker.min.mjs`;
  }
}

const docCache = new Map();

/**
 * Loads and caches a PDF document from URL.
 * Enforces a strict 3-second timeout so it never hangs indefinitely.
 * Returns null gracefully if network or loading fails.
 */
export async function getPdfDocument(url) {
  if (!url || typeof url !== 'string') return null;
  if (docCache.has(url)) {
    return docCache.get(url);
  }

  try {
    const loadingTask = pdfjsLib.getDocument({
      url,
      cMapPacked: true
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => {
        try {
          loadingTask.destroy?.();
        } catch (_e) {
          // Ignore destruction errors on timeout
        }
        reject(new Error('PDF loading timeout (3s limit reached)'));
      }, 3000)
    );

    const doc = await Promise.race([loadingTask.promise, timeoutPromise]);
    docCache.set(url, doc);
    return doc;
  } catch (err) {
    console.warn('[PDFHelper] Unable to load PDF from URL:', url, err?.message);
    return null;
  }
}

/**
 * Renders a PDF page to an HTML5 canvas at high-DPI subpixel vector scale.
 * Supports cancellation to avoid rendering collisions during rapid zoom.
 */
export async function renderPdfToCanvas({
  pdfDoc,
  pageNum = 1,
  canvas,
  targetWidth = null,
  targetHeight = null,
  dpr = 1
}) {
  if (!pdfDoc || !canvas) return null;

  try {
    const page = await pdfDoc.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1.0 });

    // Calculate scale factor from target CSS dimensions
    let scale = 1.0;
    if (targetWidth && baseViewport.width) {
      scale = (targetWidth / baseViewport.width) * dpr;
    } else if (targetHeight && baseViewport.height) {
      scale = (targetHeight / baseViewport.height) * dpr;
    } else {
      scale = dpr;
    }

    // Protect against GPU canvas memory limits while providing crisp 300+ DPI
    scale = Math.min(Math.max(scale, 0.5), 7.0);

    const viewport = page.getViewport({ scale });
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return null;

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const renderTask = page.render({
      canvasContext: ctx,
      viewport,
      background: '#ffffff'
    });

    return {
      promise: renderTask.promise,
      cancel: () => {
        try {
          renderTask.cancel();
        } catch (_e) {
          // Task already completed or cancelled
        }
      },
      aspectRatio: baseViewport.width / baseViewport.height,
      originalWidth: baseViewport.width,
      originalHeight: baseViewport.height
    };
  } catch (err) {
    if (err?.name !== 'RenderingCancelledException') {
      console.warn('[PDFHelper] Canvas render error:', err?.message);
    }
    return null;
  }
}
