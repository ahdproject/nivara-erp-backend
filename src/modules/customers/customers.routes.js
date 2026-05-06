const express = require('express');
const router = express.Router();
const customersController = require('./customers.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.get('/', authenticate, customersController.getAllCustomers);
router.get('/:id', authenticate, customersController.getCustomerById);
router.post('/', authenticate, customersController.createCustomer);
router.put('/:id', authenticate, customersController.updateCustomer);
router.delete('/:id', authenticate, customersController.deleteCustomer);

module.exports = router;
