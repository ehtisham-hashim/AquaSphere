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
            margin: 10mm 15mm;
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
            font-size: 13pt;
          }
          .receipt-wrap {
            width: 100% !important;
            max-width: 180mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            font-family: 'Times New Roman', Times, 'Tinos', serif !important;
          }
          /* Ensure font sizes look proportional and crisp on A4 paper */
          .receipt-wrap h2 {
            font-size: 20pt !important;
            margin-bottom: 4pt !important;
          }
          .receipt-wrap p {
            font-size: 12pt !important;
          }
          .receipt-wrap table {
            width: 100% !important;
            font-size: 13pt !important;
          }
          .receipt-wrap th {
            font-size: 12pt !important;
            padding: 6pt 4pt !important;
          }
          .receipt-wrap td {
            font-size: 13pt !important;
            padding: 6pt 4pt !important;
          }
          .receipt-wrap .text-xs,
          .receipt-wrap .text-sm {
            font-size: 13pt !important;
          }
          .receipt-wrap .text-lg {
            font-size: 20pt !important;
          }
          .receipt-wrap .text-\\[11px\\],
          .receipt-wrap .text-\\[10px\\] {
            font-size: 11pt !important;
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
 * Captures the exact DOM element of the receipt directly to a high-resolution PNG
 * using html2canvas and copies it to the clipboard.
 * Guaranteed 100% identical pattern to the on-screen receipt modal.
 */
export async function copyReceiptElementAsImage(elementId, fallbackData = null) {
  const element = document.getElementById(elementId);
  if (element && typeof html2canvas === 'function') {
    try {
      const canvas = await html2canvas(element, {
        scale: 2.5,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
      return await copyCanvasImageToClipboard(canvas);
    } catch (e) {
      console.warn('html2canvas capture failed, trying fallback renderer:', e);
    }
  }

  if (fallbackData) {
    const canvas = renderReceiptToCanvas(fallbackData);
    return await copyCanvasImageToClipboard(canvas);
  }

  throw new Error('Could not capture receipt image');
}

/**
 * Draws a classic market POS slip (with dashed lines, clean padding, and monospace numbers) onto a 2x Retina canvas.
 */
export function renderReceiptToCanvas({
  title,
  subtitle,
  receiptNoLabel = 'RECEIPT NO',
  receiptNo,
  dateStr,
  customerName,
  paymentMethod,
  servedBy,
  statusValue,
  items = [],
  summaryRows = [],
  netTotal,
  remarks,
  footerNote
}) {
  const scale = 2;
  const width = 540;

  const baseHeight = 320;
  const itemRowHeight = 24;
  const itemsHeight = Math.max(items.length, 1) * itemRowHeight;
  const summaryHeight = summaryRows.length * 20;
  const remarksHeight = remarks ? 36 : 0;
  const height = baseHeight + itemsHeight + summaryHeight + remarksHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#000000';

  const drawDashedLine = (yPos) => {
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(20, yPos);
    ctx.lineTo(width - 20, yPos);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const drawDoubleLine = (yPos) => {
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, yPos - 1.5);
    ctx.lineTo(width - 20, yPos - 1.5);
    ctx.moveTo(20, yPos + 1.5);
    ctx.lineTo(width - 20, yPos + 1.5);
    ctx.stroke();
  };

  // Header
  ctx.textAlign = 'center';
  ctx.font = 'bold 19px "Times New Roman", Times, serif';
  ctx.fillText(title, width / 2, 36);

  ctx.font = 'bold 12px "Times New Roman", Times, serif';
  ctx.fillText(subtitle.toUpperCase(), width / 2, 54);

  ctx.font = 'italic 11px "Times New Roman", Times, serif';
  ctx.fillStyle = '#333333';
  ctx.fillText('Pure Quality • Safe & Healthy Water', width / 2, 69);
  ctx.fillStyle = '#000000';

  let y = 78;
  drawDashedLine(y);

  y += 18;
  const drawRow = (leftLabel, leftVal, rightLabel, rightVal) => {
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px "Times New Roman", Times, serif';
    ctx.fillText(leftLabel, 20, y);
    const leftLabelWidth = ctx.measureText(leftLabel).width;
    ctx.font = '12px "Times New Roman", Times, serif';
    ctx.fillText(' ' + leftVal, 20 + leftLabelWidth, y);

    if (rightLabel !== undefined) {
      ctx.textAlign = 'right';
      if (rightVal) {
        ctx.font = '12px "Times New Roman", Times, serif';
        ctx.fillText(rightVal, width - 20, y);
        const rightValWidth = ctx.measureText(rightVal).width;
        ctx.font = 'bold 12px "Times New Roman", Times, serif';
        ctx.fillText(rightLabel + ' ', width - 20 - rightValWidth, y);
      } else {
        ctx.font = 'bold 12px "Times New Roman", Times, serif';
        ctx.fillText(rightLabel, width - 20, y);
      }
    }
    y += 18;
  };

  drawRow('REC:', receiptNo, dateStr, '');
  drawRow('CUST:', customerName || 'Walk-In Cash Customer');
  drawRow('PAY:', paymentMethod || 'CASH', statusValue || 'PAID IN FULL', '');
  
  ctx.textAlign = 'left';
  ctx.font = '11px "Times New Roman", Times, serif';
  ctx.fillStyle = '#444444';
  ctx.fillText(`STAFF: ${servedBy || 'Staff'}`, 20, y);
  ctx.fillStyle = '#000000';
  y += 14;

  drawDashedLine(y);

  // Table Headers
  y += 16;
  ctx.font = 'bold 11px "Times New Roman", Times, serif';
  ctx.textAlign = 'left';
  ctx.fillText('#', 20, y);
  ctx.fillText('ITEM', 42, y);
  ctx.textAlign = 'center';
  ctx.fillText('QTY', 310, y);
  ctx.textAlign = 'right';
  ctx.fillText('RATE', 410, y);
  ctx.fillText('AMOUNT', width - 20, y);

  y += 6;
  drawDashedLine(y);

  // Table Rows
  ctx.font = '12px "Times New Roman", Times, serif';
  items.forEach((item, idx) => {
    y += 18;
    ctx.textAlign = 'left';
    ctx.fillText(String(idx + 1), 20, y);
    const itemName = item.name.length > 28 ? item.name.slice(0, 28) + '..' : item.name;
    ctx.font = 'bold 12px "Times New Roman", Times, serif';
    ctx.fillText(itemName, 42, y);
    ctx.font = '12px "Times New Roman", Times, serif';

    ctx.textAlign = 'center';
    ctx.font = 'bold 12px "Times New Roman", Times, serif';
    ctx.fillText(String(item.qty), 310, y);
    ctx.font = '12px "Times New Roman", Times, serif';

    ctx.textAlign = 'right';
    ctx.fillText(item.unitPrice > 0 ? `${item.unitPrice.toLocaleString()}` : '—', 410, y);
    ctx.font = 'bold 12px "Times New Roman", Times, serif';
    ctx.fillText(`${item.lineTotal.toLocaleString()}`, width - 20, y);
    ctx.font = '12px "Times New Roman", Times, serif';
  });

  y += 8;
  drawDashedLine(y);

  // Summary Rows
  y += 16;
  summaryRows.forEach(row => {
    ctx.textAlign = 'left';
    ctx.font = '12px "Times New Roman", Times, serif';
    ctx.fillText(`${row.label}:`, 20, y);
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px "Times New Roman", Times, serif';
    ctx.fillText(`Rs ${row.value.toLocaleString()}`, width - 20, y);
    y += 18;
  });

  y += 2;
  drawDoubleLine(y);

  y += 18;
  ctx.textAlign = 'left';
  ctx.font = 'bold 14px "Times New Roman", Times, serif';
  ctx.fillText('NET TOTAL:', 20, y);
  ctx.textAlign = 'right';
  ctx.fillText(`Rs ${netTotal.toLocaleString()}`, width - 20, y);

  y += 6;
  drawDoubleLine(y);

  if (remarks) {
    y += 20;
    ctx.textAlign = 'left';
    ctx.font = '11px "Times New Roman", Times, serif';
    ctx.fillText(`Remarks: ${remarks}`, 20, y);
  }

  // Footer Note
  y += 22;
  drawDashedLine(y);
  y += 14;
  ctx.textAlign = 'center';
  ctx.font = 'italic 11px "Times New Roman", Times, serif';
  ctx.fillText(footerNote || 'THANK YOU FOR CHOOSING AQUASPHERE!', width / 2, y);

  return canvas;
}

/**
 * Copies canvas as image/png directly onto the system clipboard.
 */
export async function copyCanvasImageToClipboard(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('Failed to generate PNG blob'));
        return;
      }
      try {
        if (!navigator.clipboard || !navigator.clipboard.write) {
          throw new Error('Clipboard image writing is not supported in this browser');
        }
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        resolve(true);
      } catch (err) {
        reject(err);
      }
    }, 'image/png', 1.0);
  });
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

