/**
 * Base API URL configuration for backend client communication
 */
export const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
export { clearCache } from './apiCache';
