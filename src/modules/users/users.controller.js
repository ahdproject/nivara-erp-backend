const { logger } = require('../../config/logger');
const usersService = require('./users.service');

const getAllUsers = async (req, res, next) => {
  try {
    const users = await usersService.getAllUsers();
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    logger.error('Get all users error:', error);
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await usersService.getUserById(req.params.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    logger.error('Get user by ID error:', error);
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const user = await usersService.createUser(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    logger.error('Create user error:', error);
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await usersService.updateUser(req.params.id, req.body);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    logger.error('Update user error:', error);
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    await usersService.deleteUser(req.params.id);
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user error:', error);
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
