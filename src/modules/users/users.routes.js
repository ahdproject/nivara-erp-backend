const express = require('express');
const router = express.Router();
const usersController = require('./users.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.get('/', authenticate, usersController.getAllUsers);
router.get('/:id', authenticate, usersController.getUserById);
router.post('/', authenticate, usersController.createUser);
router.put('/:id', authenticate, usersController.updateUser);
router.delete('/:id', authenticate, usersController.deleteUser);

module.exports = router;
