/**
 * Centralized WhatsApp automation and dispatch utilities.
 */

/**
 * Normalizes phone numbers to standard international format without symbols or spaces (e.g. 923001234567).
 * Handles Pakistan local formats (0300..., +92300..., 92300...).
 */
export function normalizeWhatsAppPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('0')) {
    return `92${digits.slice(1)}`;
  }
  if (digits.startsWith('92')) {
    return digits;
  }
  return digits;
}

/**
 * Opens WhatsApp Web or WhatsApp app with phone and optional message text.
 */
export function openWhatsAppWeb(phone, text = '') {
  const normPhone = normalizeWhatsAppPhone(phone);
  const encodedText = text ? encodeURIComponent(text) : '';
  const url = normPhone 
    ? `https://wa.me/${normPhone}${encodedText ? `?text=${encodedText}` : ''}`
    : `https://wa.me/?text=${encodedText}`;
  window.open(url, '_blank');
}

/**
 * Templates for standardized customer messaging.
 */
export const WhatsAppTemplates = {
  invoiceSummary: (order, grandTotal, balanceDue, isWadaana) => {
    const brand = isWadaana ? 'Wadaana Water & Beverages' : 'AquaSphere Pure Water';
    const orderNo = order.id ? order.id.substring(0, 8).toUpperCase() : 'N/A';
    return [
      `*${brand} — Order Invoice #${orderNo}*`,
      `Customer: ${order.customer?.name || 'Valued Customer'}`,
      `Total Amount: Rs. ${Number(grandTotal).toLocaleString()}`,
      `Balance Due: Rs. ${Number(balanceDue).toLocaleString()}`,
      `Delivery Status: ${order.deliveryStatus || 'Pending'}`,
      ``,
      `Your digital invoice image is ready. Thank you for your business!`,
      `Helpline: 051-5454438 | 0300-9149143`
    ].join('\n');
  },

  overdueBillReminder: (customer, isWadaana) => {
    const brand = isWadaana ? 'Wadaana Water & Beverages' : 'AquaSphere Pure Water';
    const balance = Number(customer.currentBalance || customer.unpaidAmount || 0).toLocaleString();
    return [
      `*Notice: Outstanding Bill Reminder — ${brand}*`,
      `Dear ${customer.name || 'Customer'},`,
      ``,
      `This is a friendly reminder that you have an outstanding balance of *Rs. ${balance}* on your account.`,
      `Kindly arrange payment at your earliest convenience to maintain uninterrupted delivery service.`,
      ``,
      `If you have already paid, please ignore this notice.`,
      `Queries: 051-5454438 | 0300-9149143`
    ].join('\n');
  },

  inactivityReengagement: (customer, isWadaana) => {
    const brand = isWadaana ? 'Wadaana Water & Beverages' : 'AquaSphere Pure Water';
    return [
      `*Greetings from ${brand}!*`,
      `Dear ${customer.name || 'Customer'},`,
      ``,
      `We noticed it has been a while since your last pure water delivery. We'd love to refill your stock today!`,
      `Reply to this message or call us to schedule your fresh supply.`,
      ``,
      `Orders & Delivery: 051-5454438 | 0300-9149143`
    ].join('\n');
  }
};
