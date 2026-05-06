const { logger } = require('../config/logger');

const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`User ${req.user.id} attempted unauthorized access with role ${req.user.role}`);
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = { requireRole: roleMiddleware };
