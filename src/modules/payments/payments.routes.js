const router      = require('express').Router();
const ctrl        = require('./payments.controller');
const { authenticate }      = require('../../middlewares/auth.middleware');
const { requireRole }       = require('../../middlewares/role.middleware');
const { requirePermission } = require('../../middlewares/processAccess.middleware');
const {
  validate,
  recordPaymentSchema,
  updatePaymentSchema,
} = require('./payments.validation');

router.use(authenticate);

// ─── Record & List Payments ───────────────────────────────────────────────────
router.post(  '/',                requireRole('admin','manager','accounts'),  validate(recordPaymentSchema), ctrl.record);
router.get(   '/',                requirePermission('payments', 'view'),       ctrl.getAll);
router.get(   '/overdue',         requirePermission('payments', 'view'),       ctrl.getOverdue);
router.get(   '/outstanding',     requirePermission('payments', 'view'),       ctrl.getOutstanding);
router.get(   '/monthly-summary', requirePermission('payments', 'view'),       ctrl.getMonthlySummary);

// ─── Per Booking ──────────────────────────────────────────────────────────────
router.get(   '/booking/:bookingId',         requirePermission('payments', 'view'),  ctrl.getByBooking);
router.get(   '/booking/:bookingId/ledger',  requirePermission('payments', 'view'),  ctrl.getLedger);

// ─── Single Payment ───────────────────────────────────────────────────────────
router.get(   '/:id',   requirePermission('payments', 'view'),                        ctrl.getById);
router.put(   '/:id',   requireRole('admin','manager'), validate(updatePaymentSchema), ctrl.update);
router.delete('/:id',   requireRole('admin'),                                          ctrl.remove);

module.exports = router;