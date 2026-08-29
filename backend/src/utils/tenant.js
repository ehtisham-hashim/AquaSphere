/**
 * Resolves tenant prefix from request.
 * Auth middleware sets req.tenant — controllers should use this.
 * Falls back to header/cookie for middleware that runs before auth.
 */
export function getTenantPrefix(req) {
  const raw = (
    req.tenant ||
    req.headers?.['x-tenant'] ||
    req.headers?.['x-company-context'] ||
    req.cookies?.tenant ||
    req.cookies?.company ||
    req.query?.tenant ||
    req.query?.company ||
    'aquasphere'
  ).toString().toLowerCase();
  return raw === 'wadaana' ? 'wadaana' : 'aquasphere';
}
