import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Initialize PDF.js worker using Vite asset URL resolution
if (typeof window !== 'undefined' && pdfjsLib?.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

const docCache = new Map();

/**
 * Loads and caches a PDF document from URL.
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
      enableWebGL: true
    });
    const doc = await loadingTask.promise;
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
