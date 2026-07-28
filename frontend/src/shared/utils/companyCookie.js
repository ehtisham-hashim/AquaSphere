/**
 * Utility functions for managing company context via cookies and localStorage.
 */

export function getCompanyFromCookie() {
  if (typeof window !== 'undefined') {
    const localVal = localStorage.getItem('tenant') || localStorage.getItem('company');
    if (localVal) {
      const normalized = localVal.trim().toLowerCase();
      if (normalized === 'wadaana' || normalized === 'aquasphere') return normalized;
    }
  }

  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith('company=') || cookie.startsWith('tenant=')) {
        const val = cookie.split('=')[1]?.trim().toLowerCase();
        if (val === 'wadaana' || val === 'aquasphere') return val;
      }
    }
  }

  return 'aquasphere';
}

export function setCompanyCookie(companyName) {
  if (typeof document === 'undefined') return;

  const validCompany = (companyName && companyName.toLowerCase() === 'wadaana') ? 'wadaana' : 'aquasphere';
  const maxAge = 365 * 24 * 60 * 60; // 1 year

  document.cookie = `company=${validCompany}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `tenant=${validCompany}; path=/; max-age=${maxAge}; SameSite=Lax`;
  localStorage.setItem('tenant', validCompany);
  localStorage.setItem('company', validCompany);
}
