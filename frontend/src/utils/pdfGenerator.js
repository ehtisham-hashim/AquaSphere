import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generates an exact A5 portrait PDF from a DOM element.
 * @param {HTMLElement} element - The DOM element to render.
 * @param {string} filename - The filename for download.
 * @param {'print'|'download'} mode - Action mode ('print' opens PDF viewer with autoPrint; 'download' saves file).
 */
export async function generateA5Pdf(element, filename = 'document.pdf', mode = 'print') {
  if (!element) {
    console.error('generateA5Pdf: Element not found');
    return;
  }

  let printWindow = null;
  if (mode === 'print') {
    // Open window immediately during user interaction to avoid popup blocker
    printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Generating A5 PDF...</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background-color: #f8fafc;
                color: #475569;
              }
              .spinner {
                width: 36px;
                height: 36px;
                border: 3px solid #cbd5e1;
                border-top-color: #0284c7;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                margin-bottom: 16px;
              }
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            </style>
          </head>
          <body>
            <div class="spinner"></div>
            <p>Preparing A5 document for printing...</p>
          </body>
        </html>
      `);
    }
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution for crisp text
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');

    // A5 dimensions in mm: 148 x 210
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5'
    });

    const pageWidth = 148;
    const pageHeight = 210;
    const margin = 8; // 8mm margin
    const contentWidth = pageWidth - (margin * 2); // 132mm

    const imgHeight = (canvas.height * contentWidth) / canvas.width;
    const maxContentHeight = pageHeight - (margin * 2); // 194mm

    let finalWidth = contentWidth;
    let finalHeight = imgHeight;

    // If receipt height exceeds page, scale down proportionally so it fits on single A5 slip
    if (finalHeight > maxContentHeight) {
      const scale = maxContentHeight / finalHeight;
      finalWidth = finalWidth * scale;
      finalHeight = maxContentHeight;
    }

    const xOffset = (pageWidth - finalWidth) / 2;
    const yOffset = margin;

    pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight, undefined, 'FAST');

    if (mode === 'download') {
      pdf.save(filename);
      return;
    }

    // Mode is print: trigger autoPrint and stream blob to the new window
    pdf.autoPrint();
    const blob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    if (printWindow) {
      printWindow.location.href = blobUrl;
    } else {
      // Fallback if popup was blocked
      const fallbackWin = window.open(blobUrl, '_blank');
      if (!fallbackWin) {
        pdf.save(filename);
      }
    }

    // Clean up blob URL after 2 minutes
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 120000);
  } catch (error) {
    console.error('Error generating A5 PDF:', error);
    if (printWindow) {
      printWindow.close();
    }
    throw error;
  }
}

/**
 * Copies the receipt/invoice image or PDF directly to the system clipboard.
 * When pasted (Ctrl+V) into WhatsApp Web, Telegram, or Gmail, it attaches seamlessly.
 * @param {HTMLElement} element - The DOM element.
 * @param {string} filename - Filename.
 * @returns {Promise<{success: boolean, type: string}>}
 */
export async function copyReceiptToClipboard(element, _filename = 'receipt.pdf') {
  if (!element) {
    throw new Error('Element not found');
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff'
  });

  const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!pngBlob) {
    throw new Error('Failed to generate image blob');
  }

  // Attempt to write image/png to the clipboard
  if (navigator.clipboard && window.ClipboardItem) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': pngBlob
        })
      ]);
      return { success: true, type: 'image' };
    } catch (err) {
      console.warn('ClipboardItem write failed, trying fallback...', err);
    }
  }

  throw new Error('Clipboard write permission denied or unsupported in this browser.');
}

/**
 * Shares the PDF document natively using the Web Share API (especially on mobile / WhatsApp).
 * @param {HTMLElement} element - The DOM element.
 * @param {string} filename - Filename.
 * @param {string} title - Share title.
 * @returns {Promise<boolean>}
 */
export async function sharePdf(element, filename = 'receipt.pdf', title = 'Receipt') {
  if (!element) return false;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff'
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5'
  });

  const pageWidth = 148;
  const pageHeight = 210;
  const margin = 8;
  const contentWidth = pageWidth - (margin * 2);
  const imgHeight = (canvas.height * contentWidth) / canvas.width;
  const maxContentHeight = pageHeight - (margin * 2);

  let finalWidth = contentWidth;
  let finalHeight = imgHeight;
  if (finalHeight > maxContentHeight) {
    const scale = maxContentHeight / finalHeight;
    finalWidth = finalWidth * scale;
    finalHeight = maxContentHeight;
  }

  const xOffset = (pageWidth - finalWidth) / 2;
  const yOffset = margin;
  pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight, undefined, 'FAST');

  const pdfBlob = pdf.output('blob');
  const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    await navigator.share({
      files: [pdfFile],
      title: title,
      text: `${title} from AquaSphere / Wadaana`
    });
    return true;
  }

  return false;
}

