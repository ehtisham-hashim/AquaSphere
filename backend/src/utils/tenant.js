/**
 * Resolves normalized tenant prefix ('aquasphere' or 'wadaana') from request context.
 *
 * @param {import('express').Request} req - Express request object.
 * @returns {'aquasphere' | 'wadaana'} Validated tenant prefix.
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
