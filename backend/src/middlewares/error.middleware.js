import multer from 'multer';

export const errorHandler = (err, req, res, _next) => {
  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, status: 409, message: 'Record already exists. Unique constraint failed.' });
  }

  // ponytail: clean 400 for multer errors instead of default 500
  if (err instanceof multer.MulterError || err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'File too large. Maximum size is 15MB.'
      : (err.message || 'File upload error');
    return res.status(400).json({ success: false, status: 400, message: msg, error: msg });
  }
  
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (status >= 500) {
    console.error('Error:', err.message || err);
  }
  
  res.status(status).json({
    success: false,
    status,
    message,
    errors: err.errors || []
  });
};
