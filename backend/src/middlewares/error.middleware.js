/**
 * Global Express error handling middleware that formats ApiError instances and database constraint violations.
 *
 * @param {Error} err - Error object.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} _next - Express next function.
 * @returns {void}
 */
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
