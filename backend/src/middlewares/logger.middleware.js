import morgan from 'morgan';

morgan.token('tenant', (req) => {
  return req.headers?.['x-tenant'] || req.headers?.['x-company-context'] || req.tenant || 'aquasphere';
});

morgan.token('user', (req) => {
  return req.user ? `${req.user.role}:${req.user.name || req.user.id?.substring(0, 6)}` : 'anon';
});

export const devLogger = morgan(
  ':method :url :status :response-time ms - [:tenant] [:user] :res[content-length]B'
);

export const prodLogger = morgan((tokens, req, res) => {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: Number(tokens.status(req, res)),
    responseTimeMs: Number(tokens['response-time'](req, res)),
    contentLength: tokens.res(req, res, 'content-length') || '0',
    tenant: tokens.tenant(req, res),
    user: tokens.user(req, res),
    ip: tokens['remote-addr'](req, res)
  });
});
