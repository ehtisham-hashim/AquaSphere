/**
 * Minimal tenant context accessor and setter.
 */
export function getCompanyFromCookie() {
  const val = (typeof window !== 'undefined' ? localStorage.getItem('tenant') || localStorage.getItem('company') : '') || 'aquasphere';
  return val.toLowerCase() === 'wadaana' ? 'wadaana' : 'aquasphere';
}

export function setCompanyCookie(companyName) {
  const valid = (companyName && companyName.toLowerCase() === 'wadaana') ? 'wadaana' : 'aquasphere';
  if (typeof window !== 'undefined') {
    localStorage.setItem('tenant', valid);
    localStorage.setItem('company', valid);
    document.cookie = `tenant=${valid}; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `company=${valid}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.setAttribute('data-tenant', valid);
  }
}
