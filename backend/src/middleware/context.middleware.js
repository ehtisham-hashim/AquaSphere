export const contextMiddleware = (req, res, next) => {
  const company = req.headers['x-company-context'];
  if (!company || (company !== 'aquasphere' && company !== 'badana')) {
    return res.status(400).json({ status: 400, message: 'Invalid or missing x-company-context header' });
  }
  req.company = company;
  next();
};
