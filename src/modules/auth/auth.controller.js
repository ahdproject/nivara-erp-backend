const { logger } = require('../../config/logger');
const authService = require('./auth.service');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;
    const result = await authService.register(email, password, name, role);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Register error:', error);
    next(error);
  }
};

module.exports = {
  login,
  register,
};
