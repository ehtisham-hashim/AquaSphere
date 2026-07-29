export const errorHandler = (err, req, res, next) => {
  if (err.code === 'P2002') {
    return res.status(409).json({ status: 409, message: 'Record already exists. Unique constraint failed.' });
  }
  
  console.error('Error:', err.message || err);
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    status,
    message,
    errors: err.errors || []
  });
};
