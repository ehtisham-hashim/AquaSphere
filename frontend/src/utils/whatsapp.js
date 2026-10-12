/**
 * Centralized WhatsApp automation and dispatch utilities for AquaSphere & Wadaana ERP.
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
 * Gets currently configured dispatch mode ('web' or 'app'). Defaults to 'web'.
 */
export function getWhatsAppMode() {
  try {
    return localStorage.getItem('aquasphere_whatsapp_mode') || 'web';
  } catch {
    return 'web';
  }
}

/**
 * Sets dispatch mode preference ('web' or 'app').
 */
export function setWhatsAppMode(mode) {
  try {
    localStorage.setItem('aquasphere_whatsapp_mode', mode === 'app' ? 'app' : 'web');
  } catch {
    // ignore local storage errors
  }
}

/**
 * Cleanly sanitizes or generates Google Maps URL.
 */
export function sanitizeMapUrl(mapLink, address) {
  if (mapLink && typeof mapLink === 'string' && mapLink.trim()) {
    const trimmed = mapLink.trim();
    return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  }
  if (address && typeof address === 'string' && address.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
  }
  return null;
}

/**
 * Opens WhatsApp Web or WhatsApp Desktop app with phone and optional message text.
 * Reuses existing browser tab ('AquaSphereWhatsAppTab') to prevent tab explosion and slow reloading.
 * Supports direct desktop protocol ('whatsapp://') when in app mode.
 */
export function openWhatsAppWeb(phone, text = '', options = {}) {
  const mode = options.mode || getWhatsAppMode();
  const normPhone = normalizeWhatsAppPhone(phone);
  const encodedText = text ? encodeURIComponent(text) : '';

  if (mode === 'app') {
    // Launch installed WhatsApp Desktop app directly
    const appUrl = normPhone
      ? `whatsapp://send?phone=${normPhone}${encodedText ? `&text=${encodedText}` : ''}`
      : `whatsapp://send?text=${encodedText}`;
    
    // Using window.location.assign triggers desktop protocol handler
    window.location.assign(appUrl);
    return;
  }

  // Web mode: reuse named window to eliminate opening duplicate tabs and reloading heavy data
  // Using web.whatsapp.com directly bypasses intermediate api.whatsapp.com splash page
  const webUrl = normPhone
    ? `https://web.whatsapp.com/send?phone=${normPhone}${encodedText ? `&text=${encodedText}` : ''}`
    : `https://web.whatsapp.com/send?text=${encodedText}`;

  const win = window.open(webUrl, 'AquaSphereWhatsAppTab');
  if (win && win.focus) {
    win.focus();
  }
}

/**
 * Alias for openWhatsAppWeb with automatic mode resolution.
 */
export const openWhatsApp = openWhatsAppWeb;

/**
 * Standardized message templates for customers, drivers, and sales operations.
 */
export const WhatsAppTemplates = {
  /**
   * Full customer profile and delivery card for driver/staff dispatch.
   */
  customerProfile: (customer, isWadaana = false) => {
    if (!customer) return '';
    const brand = isWadaana ? 'Wadaana Water & Beverages' : 'AquaSphere Pure Water';
    const custId = customer.id ? customer.id.slice(0, 8).toUpperCase() : 'N/A';
    const mapUrl = sanitizeMapUrl(customer.mapLink, customer.address);
    const balance = Number(customer.currentBalance || 0);
    const bottleBal = Number(customer.cachedBottleBalance ?? customer.bottleBalance ?? 0);

    // Products buying badges/summary
    const products = [];
    if (customer.buysPure19L || customer.customPricePure19L) {
      products.push(`19L Pure (${customer.customPricePure19L ? `Rs. ${customer.customPricePure19L}` : 'Std'})`);
    }
    if (customer.buysPure05L) products.push('0.5L Pure');
    if (customer.buysPure15L) products.push('1.5L Pure');
    if (customer.buysMix05L) products.push('0.5L Mix');
    if (customer.buysMix15L) products.push('1.5L Mix');

    return [
      `📋 *CUSTOMER PROFILE — ${brand.toUpperCase()}*`,
      `🆔 Customer ID: #${custId}`,
      `👤 Name: ${customer.name || 'N/A'}`,
      `📞 Phone: ${customer.phone || 'N/A'}`,
      customer.address ? `📍 Address: ${customer.address}` : null,
      mapUrl ? `🗺️ Location: ${mapUrl}` : null,
      customer.homePictureUrl ? `📸 House Photo: ${customer.homePictureUrl}` : null,
      ``,
      `💰 *FINANCIAL & STOCK STATUS:*`,
      `Outstanding Debt: Rs. ${balance.toLocaleString()}`,
      !isWadaana ? `Empty Bottles with Customer: ${bottleBal}` : null,
      products.length > 0 ? `📦 Products: ${products.join(', ')}` : null,
      customer.remarks || customer.notes ? `\n📝 Notes: ${customer.remarks || customer.notes}` : null
    ].filter(Boolean).join('\n');
  },

  /**
   * Full order delivery dispatch message for drivers.
   */
  orderDispatch: (order, isWadaana = false) => {
    if (!order) return '';
    const brand = isWadaana ? 'WADAANA' : 'AQUASPHERE';
    const orderNo = order.id ? order.id.slice(0, 8).toUpperCase() : 'N/A';
    const cust = order.customer || {};
    const mapUrl = sanitizeMapUrl(cust.mapLink, cust.address);

    const items = Array.isArray(order.items) ? order.items : [];
    const itemsList = items.map((i) => {
      const name = i.item?.name || i.name || 'Item';
      const qty = i.quantity || 0;
      const rate = Number(i.price || 0);
      return `  • ${name}: ${qty} ${i.item?.unit || 'Units'} @ Rs. ${rate.toLocaleString()}`;
    }).join('\n');

    const totalQty = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    const grandTotal = Number(order.totalAmount || 0);
    const totalPaid = Number(order.paidAmount || 0);
    const balanceDue = grandTotal - totalPaid;
    const targetDate = order.deliveryDate 
      ? new Date(order.deliveryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : (order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB') : 'Immediate');

    return [
      `📦 *DELIVERY ORDER DISPATCH — ${brand}*`,
      `🆔 Order: #${orderNo}`,
      `📅 Target Delivery: ${targetDate}`,
      ``,
      `👤 *CUSTOMER DETAILS:*`,
      `Name: ${cust.name || 'N/A'}`,
      `Phone: ${cust.phone || 'N/A'}`,
      cust.address ? `Address: ${cust.address}` : null,
      mapUrl ? `Maps Location: ${mapUrl}` : null,
      cust.homePictureUrl ? `House Picture: ${cust.homePictureUrl}` : null,
      ``,
      `🛍️ *ITEMS TO DELIVER:*`,
      itemsList || '  • No items specified',
      `Total Units: ${totalQty}`,
      ``,
      `💰 *PAYMENT / BILL:*`,
      `Total Bill: Rs. ${grandTotal.toLocaleString()}`,
      `Paid: Rs. ${totalPaid.toLocaleString()}`,
      `To Collect: Rs. ${balanceDue > 0 ? balanceDue.toLocaleString() : '0 (Already Paid)'}`,
      `Payment Status: ${order.paymentStatus || 'UNPAID'}`,
      order.remarks ? `\n📝 Notes: ${order.remarks}` : null
    ].filter(Boolean).join('\n');
  },

  /**
   * Invoice summary message.
   */
  invoiceSummary: (order, grandTotal, balanceDue, isWadaana = false, withGst = false) => {
    const brand = withGst 
      ? (isWadaana ? 'Wadaana Water & Beverages' : 'AquaSphere Pure Water') 
      : 'Customer Care';
    const orderNo = order.id ? order.id.substring(0, 8).toUpperCase() : 'N/A';
    const thanksMsg = withGst 
      ? `Thank you for choosing ${isWadaana ? 'Wadaana' : 'AquaSphere'}!` 
      : 'Thanks for choosing us';
    return [
      `*${brand} — Order Invoice #${orderNo}*`,
      `Customer: ${order.customer?.name || 'Valued Customer'}`,
      `Total Amount: Rs. ${Number(grandTotal).toLocaleString()}`,
      `Balance Due: Rs. ${Number(balanceDue).toLocaleString()}`,
      `Delivery Status: ${order.deliveryStatus || 'Pending'}`,
      ``,
      `Your digital invoice image is ready. ${thanksMsg}`,
      `Helpline: 051-5454438 | 0300-9149143`
    ].join('\n');
  },

  /**
   * Outstanding debt reminder message.
   */
  overdueBillReminder: (customer, isWadaana = false) => {
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

  /**
   * Friendly re-engagement message for inactive accounts.
   */
  inactivityReengagement: (customer, isWadaana = false) => {
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
