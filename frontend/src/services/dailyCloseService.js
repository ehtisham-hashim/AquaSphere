import { API_URL } from '../utils/api';

/**
 * Daily Close API service endpoints and helper functions
 */
const opts = (tenant) => ({
  headers: { 'x-tenant': tenant },
  credentials: 'include'
});

const postOpts = (tenant, body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-tenant': tenant },
  credentials: 'include',
  body: JSON.stringify(body)
});

const sanitizeResponse = async (r) => {
  const json = await r.json();
  if (json?.message && typeof json.message === 'string') {
    if (
      json.message.includes('prisma.') ||
      json.message.includes('invocation:') ||
      json.message.includes('Foreign key') ||
      json.message.includes('constraint:')
    ) {
      json.message = 'Database operation failed. Please try again or contact support.';
    }
  }
  return json;
};

export const fetchDailyCloseStatus = (date, tenant) =>
  fetch(`${API_URL}/daily-close/status?date=${date}`, opts(tenant)).then(sanitizeResponse);

export const fetchDailyCloseHistory = (tenant) =>
  fetch(`${API_URL}/daily-close/history`, opts(tenant)).then(sanitizeResponse);

export const fetchDailySummary = (date, tenant) =>
  fetch(`${API_URL}/analytics/daily-summary?date=${date}`, opts(tenant)).then(sanitizeResponse);

export const confirmPM = (date, tenant) =>
  fetch(`${API_URL}/daily-close/pm-confirm`, postOpts(tenant, { date })).then(sanitizeResponse);

export const confirmMM = (date, tenant) =>
  fetch(`${API_URL}/daily-close/mm-confirm`, postOpts(tenant, { date })).then(sanitizeResponse);

export const confirmTM = (date, tenant) =>
  fetch(`${API_URL}/daily-close/tm-confirm`, postOpts(tenant, { date })).then(sanitizeResponse);

export const finalizeDay = (date, tenant, payload = {}) =>
  fetch(`${API_URL}/daily-close`, postOpts(tenant, { date, ...(typeof payload === 'object' ? payload : {}) })).then(sanitizeResponse);

export const reopenDay = (date, reason, tenant) =>
  fetch(`${API_URL}/daily-close/reopen`, postOpts(tenant, { date, reason })).then(sanitizeResponse);

export const fetchCounterAuditLedger = (date, tenant) =>
  fetch(`${API_URL}/daily-close/counter-audit?date=${date}`, opts(tenant)).then(sanitizeResponse);

export const submitCounterAuditLedger = (payload, tenant) =>
  fetch(`${API_URL}/daily-close/counter-audit`, postOpts(tenant, payload)).then(sanitizeResponse);
