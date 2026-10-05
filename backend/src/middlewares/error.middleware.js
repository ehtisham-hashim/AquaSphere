import multer from 'multer';

export const errorHandler = (err, req, res, _next) => {
  // P2002: Unique constraint failed
  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, status: 409, message: 'Record already exists. Unique constraint failed.' });
  }

  // P2003: Foreign key constraint failed
  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      status: 400,
      message: 'Operation failed: A referenced user, department, or record does not exist in this company.',
      error: 'Foreign key constraint violated'
    });
  }

  // P2025: Record not found
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, status: 404, message: 'Record not found.' });
  }

  // Generic Prisma database errors: strip raw SQL, schema, and invocation dumps
  if (err.name?.includes('Prisma') || err.code?.startsWith('P')) {
    console.error('[Database Error]:', err.message || err);
    return res.status(400).json({
      success: false,
      status: 400,
      message: 'Database operation could not be completed. Please ensure all required prerequisite verifications are done.'
    });
  }

  // Multer errors
  if (err instanceof multer.MulterError || err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'File too large. Maximum size is 15MB.'
      : (err.message || 'File upload error');
    return res.status(400).json({ success: false, status: 400, message: msg, error: msg });
  }

  const status = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Prevent internal error traces from showing in 500 responses
  if (status >= 500 && (message.includes('invocation:') || message.includes('at ') || message.includes('SELECT ') || message.includes('INSERT ') || message.includes('fkey'))) {
    console.error('Server Internal Error:', err);
    message = 'An unexpected system error occurred. Please try again or contact support.';
  }

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

