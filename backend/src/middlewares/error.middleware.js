import multer from 'multer';

export const errorHandler = (err, req, res, _next) => {
  const status = err.statusCode || err.status || 500;

  // Always log full technical stack trace to server console for developers
  if (status >= 500 || err.code?.startsWith?.('P') || err.name?.includes?.('Prisma')) {
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err);
  }

  // P2002: Unique constraint failed
  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, status: 409, message: 'A record with this identifier already exists.' });
  }

  // P2003: Foreign key constraint failed
  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      status: 400,
      message: 'Operation failed: A referenced user, department, or record does not exist in this company.'
    });
  }

  // P2025: Record not found
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, status: 404, message: 'The requested record was not found.' });
  }

  // Generic Prisma database errors: strip raw SQL, schema, and invocation dumps
  if (err.name?.includes('Prisma') || (typeof err.code === 'string' && err.code.startsWith('P'))) {
    return res.status(400).json({
      success: false,
      status: 400,
      message: 'Database operation could not be completed. Please ensure all required prerequisite verifications are done.'
    });
  }

  // Multer file upload errors
  if (err instanceof multer.MulterError || err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'File too large. Maximum size is 15MB.'
      : (err.message || 'File upload error');
    return res.status(400).json({ success: false, status: 400, message: msg, error: msg });
  }

  let message = err.message || 'Internal Server Error';

  // Defensive shield: never leak raw Prisma/database traces to browser
  if (typeof message === 'string' && (
    message.includes('prisma.') ||
    message.includes('Foreign key') ||
    message.includes('invocation:') ||
    message.includes('constraint:') ||
    message.includes('SELECT ') ||
    message.includes('INSERT ') ||
    message.includes('fkey') ||
    message.includes('at ')
  )) {
    message = 'An unexpected system error occurred. Please try again or contact support.';
  }

  res.status(status).json({
    success: false,
    status,
    message,
    errors: err.errors || []
  });
};
