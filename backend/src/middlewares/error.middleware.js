export const errorHandler = (err, req, res, _next) => {
  if (err.code === 'P2002') {
    return res.status(409).json({ status: 409, message: 'Record already exists. Unique constraint failed.' });
  }
  
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (status >= 500) {
    console.error('Error:', err.message || err);
  }
  
  res.status(status).json({
    status,
    message,
    errors: err.errors || []
  });
};
