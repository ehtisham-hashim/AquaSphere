import html2canvas from 'html2canvas';

/**
 * Reliably copies plain/rich text to the system clipboard across modern and legacy browsers.
 * @param {string} text - Plain text to copy.
 * @returns {Promise<boolean>}
 */
export async function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error('Copy fallback failed:', err);
    return false;
  }
}

/**
 * Cleanly prints a DOM element by isolating it inside a hidden iframe.
 * Uses 80mm thermal roll width with dynamic height measured from content length.
 * Zero wasted white space in PDF, native auto-cut on thermal roll printers.
 */
export function printReceiptElement(elementId) {
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  const oldFrame = document.getElementById('receipt-print-iframe');
  if (oldFrame) oldFrame.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'receipt-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  // Capture existing stylesheets so Tailwind & fonts load in the iframe
  const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(style => style.outerHTML)
    .join('\n');

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt</title>
        ${headStyles}
        <style>
          @page {
            size: auto;
            margin: 6mm 10mm;
          }
          * {
            box-sizing: border-box;
            color: #000000 !important;
            border-color: #000000 !important;
            background: transparent !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            font-family: 'Times New Roman', Times, 'Tinos', serif !important;
            width: 100% !important;
          }
          @media print {
            body {
              display: flex !important;
              justify-content: center !important;
            }
          }
          /* Print container: Responsive across A4, Letter, and 80mm roll printers */
          .receipt-wrap {
            width: 100% !important;
            max-width: 98mm !important;
            margin: 4mm auto !important;
            padding: 6mm 8mm !important;
            border: 1px dashed #000000 !important;
            border-radius: 3px !important;
            box-sizing: border-box !important;
            font-family: 'Times New Roman', Times, 'Tinos', serif !important;
            background: #ffffff !important;
          }
          .receipt-wrap h2 {
            font-size: 16pt !important;
            line-height: 1.2 !important;
            margin-bottom: 2pt !important;
            text-align: center !important;
          }
          .receipt-wrap p {
            font-size: 10.5pt !important;
            line-height: 1.3 !important;
            margin: 1pt 0 !important;
          }
          .receipt-wrap table {
            width: 100% !important;
            font-size: 11pt !important;
            border-collapse: collapse !important;
          }
          .receipt-wrap th {
            font-size: 10.5pt !important;
            padding: 3pt 2pt !important;
          }
          .receipt-wrap td {
            font-size: 11pt !important;
            padding: 3pt 2pt !important;
          }
          .receipt-wrap .text-xs,
          .receipt-wrap .text-sm {
            font-size: 11pt !important;
          }
          .receipt-wrap .text-lg {
            font-size: 16pt !important;
          }
          .receipt-wrap .text-\\[11px\\],
          .receipt-wrap .text-\\[10px\\] {
            font-size: 10pt !important;
          }
          .no-print {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div class="receipt-wrap">
          ${element.innerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error('Iframe print failed, falling back to window.print', e);
      window.print();
    } finally {
      setTimeout(() => {
        iframe.remove();
      }, 2000);
    }
  }, 250);
}

/**
 * Downloads a canvas element directly as a PNG image.
 */
export function downloadCanvasAsImage(canvas, filename = 'AquaSphere_Receipt.png') {
  try {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png', 1.0);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Download canvas failed:', err);
  }
}

/**
 * Copies canvas as image/png directly onto the system clipboard.
 * Preserves user activation gesture in modern browsers and falls back to download.
 */
export async function copyCanvasImageToClipboard(canvas) {
  if (navigator.clipboard && typeof navigator.clipboard.write === 'function') {
    try {
      let item;
      try {
        const blobPromise = new Promise((resolve, reject) => {
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to render PNG'));
          }, 'image/png', 1.0);
        });
        item = new ClipboardItem({ 'image/png': blobPromise });
        await navigator.clipboard.write([item]);
        return { success: true, method: 'clipboard' };
      } catch {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1.0));
        if (blob) {
          item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          return { success: true, method: 'clipboard' };
        }
      }
    } catch (clipErr) {
      console.warn('Direct clipboard write failed (permission or insecure context):', clipErr);
    }
  }

  // If clipboard image writing is blocked by browser security/permissions, download directly as PNG
  downloadCanvasAsImage(canvas, 'AquaSphere_Receipt.png');
  return { success: true, method: 'download' };
}

/**
 * Captures receipt as a high-resolution PNG image.
 * Uses pixel-perfect canvas rendering matching the exact modal pattern.
 */
export async function copyReceiptElementAsImage(elementId, receiptData = null) {
  let canvas = null;

  // 1. Primary: Use high-speed, zero-crash canvas renderer matching modal layout
  if (receiptData) {
    try {
      canvas = renderReceiptToCanvas(receiptData);
    } catch (renderErr) {
      console.warn('renderReceiptToCanvas error:', renderErr);
    }
  }

  // 2. Secondary: If no receiptData provided, attempt html2canvas on DOM element
  if (!canvas) {
    const element = document.getElementById(elementId);
    if (element && typeof html2canvas === 'function') {
      try {
        canvas = await html2canvas(element, {
          scale: 2.5,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false
        });
      } catch (h2cErr) {
        console.warn('html2canvas error:', h2cErr);
      }
    }
  }

  if (!canvas) {
    throw new Error('Failed to generate receipt image canvas');
  }

  return await copyCanvasImageToClipboard(canvas);
}

/**
 * Draws a pixel-perfect receipt slip matching the modal pattern in Times New Roman.
 */
export function renderReceiptToCanvas({
  title = 'AQUASPHERE PURE WATER',
  subtitle = 'RETAIL SALE • COUNTER DISPATCH',
  tagline = 'Pure Quality • Safe & Healthy Water',
  receiptNoLabel = 'REC:',
  receiptNo = '',
  dateStr = '',
  customerLabel = 'CUST:',
  customerName = 'Walk-In Cash Customer',
  customerPhone = '',
  paymentLabel = 'PAY:',
  paymentMethod = 'CASH',
  statusValue = 'PAID IN FULL',
  servedBy = '',
  items = [],
  summaryRows = [],
  netTotal = 0,
  remarks = '',
  footerNote = 'THANK YOU FOR CHOOSING AQUASPHERE!'
}) {
  const scale = 2.5;
  const width = 400;
  const padX = 22;
  const rightX = width - padX; // 378

  // Calculate dynamic height to ensure zero awkward white space
  let calcHeight = 24; // top padding
  calcHeight += 22; // title
  calcHeight += 18; // subtitle
  calcHeight += 16; // tagline
  calcHeight += 12; // gap & dashed line
  calcHeight += 18; // REC / date
  calcHeight += 18; // CUST
  if (customerPhone) calcHeight += 18; // PHONE if present
  calcHeight += 18; // PAY / STATUS
  if (servedBy) calcHeight += 16; // STAFF / DELIVERY
  calcHeight += 12; // gap & dashed line
  calcHeight += 18; // table header (#, ITEM, QTY, RATE, AMOUNT)
  calcHeight += 10; // gap & dashed line
  calcHeight += Math.max(items.length, 1) * 20; // item rows
  calcHeight += 12; // dashed line
  calcHeight += summaryRows.length * 18; // summary rows
  calcHeight += 12; // double line gap
  calcHeight += 24; // NET TOTAL
  calcHeight += 12; // double line gap
  if (remarks) calcHeight += 20; // remarks
  calcHeight += 12; // dashed line gap
  calcHeight += 18; // footer note
  calcHeight += 24; // bottom padding

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(calcHeight * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, calcHeight);

  // Helper drawing functions
  const drawDashedLine = (yPos) => {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(padX, yPos);
    ctx.lineTo(rightX, yPos);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const drawDoubleLine = (yPos) => {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(padX, yPos - 1.5);
    ctx.lineTo(rightX, yPos - 1.5);
    ctx.moveTo(padX, yPos + 1.5);
    ctx.lineTo(rightX, yPos + 1.5);
    ctx.stroke();
  };

  let y = 24;

  // Title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 18px "Times New Roman", Times, "Tinos", serif';
  ctx.fillText(title.toUpperCase(), width / 2, y + 14);
  y += 22;

  // Subtitle
  ctx.font = 'bold 11px "Times New Roman", Times, "Tinos", serif';
  ctx.fillText(subtitle.toUpperCase(), width / 2, y + 10);
  y += 18;

  // Tagline
  ctx.font = 'italic 11px "Times New Roman", Times, "Tinos", serif';
  ctx.fillStyle = '#374151';
  ctx.fillText(tagline, width / 2, y + 9);
  ctx.fillStyle = '#000000';
  y += 16;

  // Header separator
  y += 4;
  drawDashedLine(y);
  y += 6;

  // Meta details
  // Line 1: REC and Date
  y += 14;
  ctx.textAlign = 'left';
  ctx.font = 'bold 11px "Times New Roman", Times, "Tinos", serif';
  ctx.fillText(receiptNoLabel + ' ', padX, y);
  const recLabelWidth = ctx.measureText(receiptNoLabel + ' ').width;
  ctx.font = '11px "Times New Roman", Times, "Tinos", serif';
  ctx.fillText(receiptNo, padX + recLabelWidth, y);

  if (dateStr) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#374151';
    ctx.font = '11px "Times New Roman", Times, "Tinos", serif';
    ctx.fillText(dateStr, rightX, y);
    ctx.fillStyle = '#000000';
  }

  // Line 2: Customer
  y += 18;
  ctx.textAlign = 'left';
  ctx.font = 'bold 11px "Times New Roman", Times, "Tinos", serif';
  ctx.fillText(customerLabel + ' ', padX, y);
  const custLabelWidth = ctx.measureText(customerLabel + ' ').width;
  ctx.font = '11px "Times New Roman", Times, "Tinos", serif';
  const maxCustWidth = rightX - padX - custLabelWidth;
  let displayCust = customerName;
  if (ctx.measureText(displayCust).width > maxCustWidth) {
    while (displayCust.length > 3 && ctx.measureText(displayCust + '...').width > maxCustWidth) {
      displayCust = displayCust.slice(0, -1);
    }
    displayCust += '...';
  }
  ctx.fillText(displayCust, padX + custLabelWidth, y);

  // Line 2b: Phone (if any)
  if (customerPhone) {
    y += 18;
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px "Times New Roman", Times, "Tinos", serif';
    ctx.fillText('PHONE: ', padX, y);
    const phoneLabelWidth = ctx.measureText('PHONE: ').width;
    ctx.font = '11px "Times New Roman", Times, "Tinos", serif';
    ctx.fillText(customerPhone, padX + phoneLabelWidth, y);
  }

  // Line 3: Payment & Status
  y += 18;
  ctx.textAlign = 'left';
  ctx.font = 'bold 11px "Times New Roman", Times, "Tinos", serif';
  ctx.fillText(paymentLabel + ' ', padX, y);
  const payLabelWidth = ctx.measureText(paymentLabel + ' ').width;
  ctx.font = '11px "Times New Roman", Times, "Tinos", serif';
  ctx.fillText(paymentMethod, padX + payLabelWidth, y);

  if (statusValue) {
    ctx.textAlign = 'right';
    ctx.font = 'bold 11px "Times New Roman", Times, "Tinos", serif';
    ctx.fillText(statusValue, rightX, y);
  }

  // Line 4: Served By / Staff
  if (servedBy) {
    y += 16;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4b5563';
    ctx.font = '10.5px "Times New Roman", Times, "Tinos", serif';
    ctx.fillText(servedBy, padX, y);
    ctx.fillStyle = '#000000';
  }

  // Meta separator
  y += 6;
  drawDashedLine(y);
  y += 4;

  // Table Headers
  y += 14;
  ctx.font = 'bold 10.5px "Times New Roman", Times, "Tinos", serif';
  ctx.textAlign = 'left';
  ctx.fillText('#', padX, y);
  ctx.fillText('ITEM', padX + 22, y);
  ctx.textAlign = 'center';
  ctx.fillText('QTY', 225, y);
  ctx.textAlign = 'right';
  ctx.fillText('RATE', 305, y);
  ctx.fillText('AMOUNT', rightX, y);

  y += 6;
  drawDashedLine(y);
  y += 2;

  // Table Rows
  if (items.length === 0) {
    y += 18;
    ctx.textAlign = 'center';
    ctx.font = 'italic 11px "Times New Roman", Times, "Tinos", serif';
    ctx.fillStyle = '#6b7280';
    ctx.fillText('No items recorded', width / 2, y);
    ctx.fillStyle = '#000000';
  } else {
    items.forEach((item, idx) => {
      y += 18;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#4b5563';
      ctx.font = '10.5px "Times New Roman", Times, "Tinos", serif';
      ctx.fillText(String(idx + 1), padX, y);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 11px "Times New Roman", Times, "Tinos", serif';
      let itemName = item.name || 'Item';
      const maxItemWidth = 150;
      if (ctx.measureText(itemName).width > maxItemWidth) {
        while (itemName.length > 3 && ctx.measureText(itemName + '..').width > maxItemWidth) {
          itemName = itemName.slice(0, -1);
        }
        itemName += '..';
      }
      ctx.fillText(itemName, padX + 22, y);

      ctx.textAlign = 'center';
      ctx.font = 'bold 11px "Times New Roman", Times, "Tinos", serif';
      ctx.fillText(String(item.qty), 225, y);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#374151';
      ctx.font = '11px "Times New Roman", Times, "Tinos", serif';
      ctx.fillText(item.unitPrice > 0 ? `${Number(item.unitPrice).toLocaleString()}` : '—', 305, y);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 11px "Times New Roman", Times, "Tinos", serif';
      ctx.fillText(`${Number(item.lineTotal).toLocaleString()}`, rightX, y);
    });
  }

  y += 6;
  drawDashedLine(y);
  y += 2;

  // Summary Rows
  summaryRows.forEach(row => {
    y += 18;
    ctx.textAlign = 'left';
    ctx.font = '11.5px "Times New Roman", Times, "Tinos", serif';
    ctx.fillStyle = '#000000';
    ctx.fillText(`${row.label}:`, padX, y);

    ctx.textAlign = 'right';
    ctx.font = 'bold 11.5px "Times New Roman", Times, "Tinos", serif';
    ctx.fillText(`Rs ${Number(row.value).toLocaleString()}`, rightX, y);
  });

  // Double Line
  y += 6;
  drawDoubleLine(y);
  y += 4;

  // NET TOTAL
  y += 16;
  ctx.textAlign = 'left';
  ctx.font = 'bold 13.5px "Times New Roman", Times, "Tinos", serif';
  ctx.fillStyle = '#000000';
  ctx.fillText('NET TOTAL:', padX, y);

  ctx.textAlign = 'right';
  ctx.font = 'bold 14.5px "Times New Roman", Times, "Tinos", serif';
  ctx.fillText(`Rs ${Number(netTotal).toLocaleString()}`, rightX, y);

  // Double Line
  y += 6;
  drawDoubleLine(y);
  y += 2;

  // Remarks if present
  if (remarks) {
    y += 16;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#374151';
    ctx.font = 'italic 10.5px "Times New Roman", Times, "Tinos", serif';
    ctx.fillText(`Remarks: ${remarks}`, padX, y);
    ctx.fillStyle = '#000000';
  }

  // Footer separator
  y += 8;
  drawDashedLine(y);
  y += 14;

  // Footer Note
  ctx.textAlign = 'center';
  ctx.font = 'italic 10.5px "Times New Roman", Times, "Tinos", serif';
  ctx.fillStyle = '#374151';
  ctx.fillText(footerNote, width / 2, y);

  return canvas;
}

/**
 * Formats a Counter Sale receipt for instant WhatsApp sharing (Text fallback).
 */
export function formatCounterSaleWhatsApp(sale, items, total, paid, debt, isWadaana, user) {
  const company = isWadaana ? 'WADAANA WATER & BEVERAGES' : 'AQUASPHERE PURE WATER';
  const saleId = sale.saleNumber || sale.id?.substring(0, 8) || 'Receipt';
  const dateStr = new Date(sale.createdAt).toLocaleString();
  const customer = sale.customer?.name || 'Walk-In Cash Customer';
  const cashier = sale.createdBy?.name || user?.name || 'Staff';

  let msg = `*${company}*\n`;
  msg += `Retail & Counter Dispatch Receipt\n`;
  msg += `----------------------------------------\n`;
  msg += `*Receipt No:* ${saleId}\n`;
  msg += `*Date:* ${dateStr}\n`;
  msg += `*Customer:* ${customer}\n`;
  msg += `*Payment:* ${sale.paymentMethod || 'CASH'}\n`;
  msg += `*Served By:* ${cashier}\n`;
  msg += `----------------------------------------\n`;
  msg += `*ITEMS PURCHASED:*\n`;
  items.forEach((item, idx) => {
    msg += `${idx + 1}. *${item.name}* × ${item.qty}`;
    if (item.unitPrice > 0) msg += ` @ Rs. ${item.unitPrice.toLocaleString()}`;
    msg += ` = *Rs. ${item.lineTotal.toLocaleString()}*\n`;
  });
  msg += `----------------------------------------\n`;
  msg += `*Total Bill:* Rs. ${total.toLocaleString()}\n`;
  msg += `*Amount Paid:* Rs. ${paid.toLocaleString()}\n`;
  if (debt > 0) {
    msg += `*Customer Debt:* Rs. ${debt.toLocaleString()}\n`;
  }
  msg += `----------------------------------------\n`;
  msg += `Thank you for your business!`;
  return msg;
}

/**
 * Formats an Order Invoice for instant WhatsApp sharing (Text fallback).
 */
export function formatOrderInvoiceWhatsApp(order, items, grandTotal, totalPaid, balanceDue, isWadaana) {
  const company = isWadaana ? 'WADAANA WATER & BEVERAGES' : 'AQUASPHERE PURE WATER';
  const orderId = order.id ? order.id.substring(0, 8).toUpperCase() : 'Invoice';
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  const customer = order.customer?.name || '—';
  const phone = order.customer?.phone || '—';

  let msg = `*${company}*\n`;
  msg += `Sales Invoice\n`;
  msg += `----------------------------------------\n`;
  msg += `*Order ID:* #${orderId}\n`;
  msg += `*Date:* ${orderDate}\n`;
  msg += `*Customer:* ${customer}\n`;
  if (phone && phone !== '—') msg += `*Phone:* ${phone}\n`;
  msg += `*Delivery:* ${order.deliveryStatus || 'PENDING'}\n`;
  msg += `*Payment Status:* ${order.paymentStatus || 'UNPAID'}\n`;
  msg += `----------------------------------------\n`;
  msg += `*ITEMS:*\n`;
  items.forEach((item, idx) => {
    const qty = Number(item.quantity || 0);
    const rate = Number(item.price || 0);
    const lineTotal = qty * rate;
    msg += `${idx + 1}. *${item.item?.name || 'Item'}* × ${qty} @ Rs. ${rate.toLocaleString()} = *Rs. ${lineTotal.toLocaleString()}*\n`;
  });
  msg += `----------------------------------------\n`;
  msg += `*Subtotal:* Rs. ${grandTotal.toLocaleString()}\n`;
  msg += `*Amount Paid:* Rs. ${totalPaid.toLocaleString()}\n`;
  msg += `*Balance Due:* Rs. ${balanceDue.toLocaleString()}\n`;
  if (order.remarks) msg += `*Remarks:* ${order.remarks}\n`;
  msg += `----------------------------------------\n`;
  msg += `Thank you for your business!`;
  return msg;
}

