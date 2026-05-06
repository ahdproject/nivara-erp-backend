const express = require('express');
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/users.routes');
const projectRoutes = require('./modules/projects/projects.routes');
const flatRoutes = require('./modules/flats/flats.routes');
const customerRoutes = require('./modules/customers/customers.routes');
const bookingRoutes = require('./modules/bookings/bookings.routes');
const paymentRoutes = require('./modules/payments/payments.routes');
const brokerRoutes = require('./modules/brokers/brokers.routes');
const expenseRoutes = require('./modules/expenses/expenses.routes');
const documentRoutes = require('./modules/document/document.routes');
const reportRoutes = require('./modules/reports/reports.routes');
// Temporarily disable notifications due to loading hang
// const notificationRoutes = require('./modules/notifications/notifications.routes');

const router = express.Router();

// Public Routes
router.use('/auth', authRoutes);

// Protected Routes (can add authentication middleware here)
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/flats', flatRoutes);
router.use('/customers', customerRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/brokers', brokerRoutes);
router.use('/expenses', expenseRoutes);
router.use('/documents', documentRoutes);
router.use('/reports', reportRoutes);
// router.use('/notifications', notificationRoutes);

module.exports = router;
