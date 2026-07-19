export const roleMiddleware = (roles) => {
  return (req, res, next) => {
    const user = req.user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ status: 403, message: 'Forbidden: Insufficient role' });
    }
    next();
  };
};
