import { ApiError } from '../utils/ApiError.js';

export const requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      throw new ApiError(401, 'Unauthorized request');
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'Forbidden: Insufficient privileges');
    }

    next();
  };
};
