import { ApiError } from '../utils/ApiError.js';

export const requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      throw new ApiError(401, 'Unauthorized request');
    }

    const allowedRoles = roles.flat();
    if (req.user.role === 'OWNER' || allowedRoles.includes(req.user.role)) {
      return next();
    }

    throw new ApiError(403, 'Forbidden: Insufficient privileges');
  };
};
