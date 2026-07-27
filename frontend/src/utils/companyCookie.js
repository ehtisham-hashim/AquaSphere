/**
 * Utility functions for managing company context via cookies and localStorage.
 */

export function getCompanyFromCookie() {
  if (typeof document === 'undefined') return 'aquasphere';

  const cookies = document.cookie.split(';');
  let companyValue = null;

  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith('company=')) {
      companyValue = cookie.substring('company='.length).trim();
      break;
    }
    if (cookie.startsWith('tenant=') && !companyValue) {
      companyValue = cookie.substring('tenant='.length).trim();
    }
  }

  if (!companyValue) {
    companyValue = localStorage.getItem('company') || localStorage.getItem('tenant');
  }

  if (companyValue) {
    const normalized = companyValue.toLowerCase();
    if (normalized === 'wadaana') return 'wadaana';
    if (normalized === 'aquasphere') return 'aquasphere';
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
