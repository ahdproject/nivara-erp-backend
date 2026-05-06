const { logger } = require('../../config/logger');
const customersService = require('./customers.service');

const getAllCustomers = async (req, res, next) => {
  try {
    const customers = await customersService.getAllCustomers();
    res.status(200).json({ success: true, data: customers });
  } catch (error) {
    logger.error('Get all customers error:', error);
    next(error);
  }
};

const getCustomerById = async (req, res, next) => {
  try {
    const customer = await customersService.getCustomerById(req.params.id);
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    logger.error('Get customer by ID error:', error);
    next(error);
  }
};

const createCustomer = async (req, res, next) => {
  try {
    const customer = await customersService.createCustomer(req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    logger.error('Create customer error:', error);
    next(error);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    const customer = await customersService.updateCustomer(req.params.id, req.body);
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    logger.error('Update customer error:', error);
    next(error);
  }
};

const deleteCustomer = async (req, res, next) => {
  try {
    await customersService.deleteCustomer(req.params.id);
    res.status(200).json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    logger.error('Delete customer error:', error);
    next(error);
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
