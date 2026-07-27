/**
 * Intercepts all global fetch requests to inject the `x-tenant` header.
 * This allows the backend to know which workspace the user is currently operating in.
 */

const originalFetch = window.fetch;

window.fetch = async (url, options = {}) => {
  // We only want to inject headers for API requests to our backend
  const isApiRequest = typeof url === 'string' && url.startsWith('/api/');

  if (isApiRequest) {
    const tenant = localStorage.getItem('tenant') || 'aquasphere';
    
    // Ensure headers object exists
    options.headers = {
      ...options.headers,
      'x-tenant': tenant
    };
  }

  return originalFetch(url, options);
};
