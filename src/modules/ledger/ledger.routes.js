const router      = require('express').Router();
const ctrl        = require('./ledger.controller');
const { authenticate }      = require('../../middlewares/auth.middleware');
const { requirePermission } = require('../../middlewares/processAccess.middleware');

router.use(authenticate);

// ─── Customer-level views ─────────────────────────────────────────────────────
router.get('/',                          requirePermission('ledger', 'view'), ctrl.getAllCustomerSummaries);
router.get('/customer/:customerId',      requirePermission('ledger', 'view'), ctrl.getCustomerLedger);
router.get('/customer/:customerId/statement', requirePermission('ledger', 'view'), ctrl.getStatement);

// ─── Booking-level ledger ─────────────────────────────────────────────────────
router.get('/booking/:bookingId',        requirePermission('ledger', 'view'), ctrl.getBookingLedger);

// ─── Aggregated views ─────────────────────────────────────────────────────────
router.get('/overdue',                   requirePermission('ledger', 'view'), ctrl.getOverdueCustomers);
router.get('/fully-paid',                requirePermission('ledger', 'view'), ctrl.getFullyPaidCustomers);

module.exports = router;