const router      = require('express').Router();
const ctrl        = require('./notifications.controller');
const { authenticate }      = require('../../middlewares/auth.middleware');
const { requireRole }       = require('../../middlewares/role.middleware');
const { requirePermission } = require('../../middlewares/processAccess.middleware');
const {
  validate,
  sendReceiptSchema,
  sendReminderSchema,
  sendCustomSchema,
} = require('../../providers/notification.validation');

router.use(authenticate);

// ─── Trigger Notifications ────────────────────────────────────────────────────
router.post('/payment-receipt',   requireRole('admin','manager','accounts'), validate(sendReceiptSchema),  ctrl.sendPaymentReceipt);
router.post('/payment-reminder',  requireRole('admin','manager','accounts'), validate(sendReminderSchema), ctrl.sendPaymentReminder);
router.post('/booking-confirmed', requireRole('admin','manager'),            validate(sendReceiptSchema),  ctrl.sendBookingConfirmation);
router.post('/overdue-alerts',    requireRole('admin','manager'),                                          ctrl.sendOverdueAlerts);
router.post('/custom',            requireRole('admin'),                      validate(sendCustomSchema),   ctrl.sendCustom);

// ─── Notification Log ─────────────────────────────────────────────────────────
router.get('/log',                requirePermission('notifications','view'),  ctrl.getLog);
router.get('/log/booking/:bookingId', requirePermission('notifications','view'), ctrl.getLogByBooking);
router.get('/log/customer/:customerId', requirePermission('notifications','view'), ctrl.getLogByCustomer);

module.exports = router;