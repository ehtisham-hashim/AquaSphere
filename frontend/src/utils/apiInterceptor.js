/**
 * Intercepts all global fetch requests to inject the `x-tenant` header.
 * Correctly matches both relative (`/api/`) and absolute (`http://localhost:5000/api`) paths from VITE_API_URL.
 */
import { getCompanyFromCookie } from './companyCookie';

const originalFetch = window.fetch;

window.fetch = async (url, options = {}) => {
  const urlString = typeof url === 'string' ? url : url instanceof Request ? url.url : String(url);
  
  // Check if request targets our backend API
  const VITE_API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:3000/api/v1';
  const isApiRequest = urlString.includes('/api') || urlString.includes('localhost:3000') || urlString.includes('localhost:5000') || urlString.includes(VITE_API_URL);

  if (isApiRequest) {
    const tenant = getCompanyFromCookie();
    
    // Properly merge headers
    const existingHeaders = options.headers instanceof Headers 
      ? Object.fromEntries(options.headers.entries()) 
      : (options.headers || {});

    options.headers = {
      ...existingHeaders,
      'x-tenant': tenant
    };
  }

  return originalFetch(url, options);
};
