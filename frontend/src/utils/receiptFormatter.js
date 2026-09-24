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
 * Formats a Counter Sale receipt for instant WhatsApp sharing.
 */
export function formatCounterSaleWhatsApp(sale, items, total, paid, debt, isWadaana, user) {
  const company = isWadaana ? 'WADAANA WATER & BEVERAGES' : 'AQUASPHERE PURE WATER';
  const saleId = sale.saleNumber || sale.id?.substring(0, 8) || 'Receipt';
  const dateStr = new Date(sale.createdAt).toLocaleString();
  const customer = sale.customer?.name || 'Walk-In Cash Customer';
  const cashier = sale.createdBy?.name || user?.name || 'Staff';

  let msg = `*${company}*\n`;
  msg += `Retail & Counter Dispatch Receipt\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `*Receipt No:* ${saleId}\n`;
  msg += `*Date:* ${dateStr}\n`;
  msg += `*Customer:* ${customer}\n`;
  msg += `*Payment:* ${sale.paymentMethod || 'CASH'}\n`;
  msg += `*Served By:* ${cashier}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `*ITEMS PURCHASED:*\n`;
  items.forEach((item, idx) => {
    msg += `${idx + 1}. *${item.name}* × ${item.qty}`;
    if (item.unitPrice > 0) msg += ` @ Rs. ${item.unitPrice.toLocaleString()}`;
    msg += ` = *Rs. ${item.lineTotal.toLocaleString()}*\n`;
  });
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `*Total Bill:* Rs. ${total.toLocaleString()}\n`;
  msg += `*Amount Paid:* Rs. ${paid.toLocaleString()}\n`;
  if (debt > 0) {
    msg += `*Customer Debt:* Rs. ${debt.toLocaleString()}\n`;
  }
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `Thank you for your business!`;
  return msg;
}

/**
 * Formats an Order Invoice for instant WhatsApp sharing.
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
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `*Order ID:* #${orderId}\n`;
  msg += `*Date:* ${orderDate}\n`;
  msg += `*Customer:* ${customer}\n`;
  if (phone && phone !== '—') msg += `*Phone:* ${phone}\n`;
  msg += `*Delivery:* ${order.deliveryStatus || 'PENDING'}\n`;
  msg += `*Payment Status:* ${order.paymentStatus || 'UNPAID'}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `*ITEMS:*\n`;
  items.forEach((item, idx) => {
    const qty = Number(item.quantity || 0);
    const rate = Number(item.price || 0);
    const lineTotal = qty * rate;
    msg += `${idx + 1}. *${item.item?.name || 'Item'}* × ${qty} @ Rs. ${rate.toLocaleString()} = *Rs. ${lineTotal.toLocaleString()}*\n`;
  });
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `*Subtotal:* Rs. ${grandTotal.toLocaleString()}\n`;
  msg += `*Amount Paid:* Rs. ${totalPaid.toLocaleString()}\n`;
  msg += `*Balance Due:* Rs. ${balanceDue.toLocaleString()}\n`;
  if (order.remarks) msg += `*Remarks:* ${order.remarks}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `Thank you for your business!`;
  return msg;
}
