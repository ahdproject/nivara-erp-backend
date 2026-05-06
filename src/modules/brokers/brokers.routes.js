const router      = require('express').Router();
const ctrl        = require('./brokers.controller');
const { authenticate }      = require('../../middlewares/auth.middleware');
const { requireRole }       = require('../../middlewares/role.middleware');
const { requirePermission } = require('../../middlewares/processAccess.middleware');
const {
  validate,
  createBrokerSchema,
  updateBrokerSchema,
  createCommissionSchema,
  payCommissionSchema,
} = require('./brokers.validation');

router.use(authenticate);

// ─── Specific aggregate routes FIRST (before /:id) ───────────────────────────
router.get( '/summary',                    requirePermission('brokers', 'view'),  ctrl.getSummary);
router.get( '/commissions/pending',        requirePermission('brokers', 'view'),  ctrl.getPendingCommissions);
router.get( '/commissions/all',            requirePermission('brokers', 'view'),  ctrl.getAllCommissions);

// ─── Broker CRUD ──────────────────────────────────────────────────────────────
router.get(  '/',                          requirePermission('brokers', 'view'),                           ctrl.getAll);
router.get(  '/:id',                       requirePermission('brokers', 'view'),                           ctrl.getById);
router.post( '/',                          requireRole('admin', 'manager'), validate(createBrokerSchema),  ctrl.create);
router.put(  '/:id',                       requireRole('admin', 'manager'), validate(updateBrokerSchema),  ctrl.update);
router.patch('/:id/deactivate',            requireRole('admin'),                                           ctrl.deactivate);
router.patch('/:id/activate',              requireRole('admin'),                                           ctrl.activate);

// ─── Per-broker commission routes ─────────────────────────────────────────────
router.get(  '/:id/commissions',           requirePermission('brokers', 'view'),                                       ctrl.getBrokerCommissions);
router.get(  '/:id/commissions/summary',   requirePermission('brokers', 'view'),                                       ctrl.getBrokerCommissionSummary);
router.post( '/:id/commissions',           requireRole('admin', 'manager'), validate(createCommissionSchema),          ctrl.createCommission);
router.patch('/:id/commissions/:cid/pay',  requireRole('admin', 'manager', 'accounts'), validate(payCommissionSchema), ctrl.payCommission);
router.get(  '/:id/commissions/:cid/payments', requirePermission('brokers', 'view'),                                   ctrl.getCommissionPayments);

module.exports = router;