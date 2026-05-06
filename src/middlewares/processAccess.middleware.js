const { logger } = require('../config/logger');

const processAccessMiddleware = (req, res, next) => {
  // Middleware to log and track process access
  logger.debug(`${req.method} ${req.path}`, {
    user: req.user?.id || 'anonymous',
    ip: req.ip,
  });

  next();
};

// Simple permission guard factory — can be replaced with a full RBAC check
const requirePermission = (resource, action) => (req, res, next) => {
  // For now, allow if authenticated. Extend to check req.user.permissions
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  return next();
};

module.exports = { requirePermission, processAccessMiddleware };
