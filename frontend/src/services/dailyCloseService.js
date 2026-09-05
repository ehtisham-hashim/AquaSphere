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

export const fetchDailyCloseStatus = (date, tenant) =>
  fetch(`${API_URL}/daily-close/status?date=${date}`, opts(tenant)).then(r => r.json());

export const fetchDailyCloseHistory = (tenant) =>
  fetch(`${API_URL}/daily-close/history`, opts(tenant)).then(r => r.json());

export const fetchDailySummary = (date, tenant) =>
  fetch(`${API_URL}/analytics/daily-summary?date=${date}`, opts(tenant)).then(r => r.json());

export const confirmPM = (date, tenant) =>
  fetch(`${API_URL}/daily-close/pm-confirm`, postOpts(tenant, { date })).then(r => r.json());

export const confirmMM = (date, tenant) =>
  fetch(`${API_URL}/daily-close/mm-confirm`, postOpts(tenant, { date })).then(r => r.json());

export const finalizeDay = (date, tenant) =>
  fetch(`${API_URL}/daily-close`, postOpts(tenant, { date })).then(r => r.json());

export const reopenDay = (date, reason, tenant) =>
  fetch(`${API_URL}/daily-close/reopen`, postOpts(tenant, { date, reason })).then(r => r.json());
