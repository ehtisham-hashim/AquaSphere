/**
 * Standardized API response utilities for AquaSphere & Wadaana.
 * Ensures uniform JSON format: { success: boolean, data?: any, message?: string }
 */

export const sendSuccess = (res, data = null, statusCode = 200, extra = {}) => {
  return res.status(statusCode).json({ success: true, data, ...extra });
};

export const sendError = (res, message = 'Internal server error', statusCode = 500, extra = {}) => {
  return res.status(statusCode).json({ success: false, message, error: message, ...extra });
};
