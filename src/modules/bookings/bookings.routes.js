const router      = require('express').Router();
const ctrl        = require('./bookings.controller');
const { authenticate }      = require('../../middlewares/auth.middleware');
const { requireRole }       = require('../../middlewares/role.middleware');
const { requirePermission } = require('../../middlewares/processAccess.middleware');
const {
  validate,
  createCustomerSchema,
  updateCustomerSchema,
  createBookingSchema,
  updateBookingSchema,
  cancelBookingSchema,
  addScheduleSchema,
} = require('./bookings.validation');

router.use(authenticate);

// ─── Customers ────────────────────────────────────────────────────────────────
router.get(  '/customers',      requirePermission('bookings', 'view'),                             ctrl.getAllCustomers);
router.get(  '/customers/:id',  requirePermission('bookings', 'view'),                             ctrl.getCustomerById);
router.post( '/customers',      requireRole('admin','manager','accounts'), validate(createCustomerSchema), ctrl.createCustomer);
router.put(  '/customers/:id',  requireRole('admin','manager','accounts'), validate(updateCustomerSchema), ctrl.updateCustomer);

// ─── Bookings ─────────────────────────────────────────────────────────────────
router.get(  '/',               requirePermission('bookings', 'view'),                             ctrl.getAll);
router.get(  '/:id',            requirePermission('bookings', 'view'),                             ctrl.getById);
router.post( '/',               requireRole('admin','manager'),            validate(createBookingSchema),  ctrl.create);
router.put(  '/:id',            requireRole('admin','manager'),            validate(updateBookingSchema),  ctrl.update);
router.patch('/:id/cancel',     requireRole('admin'),                      validate(cancelBookingSchema),  ctrl.cancel);
router.patch('/:id/status',     requireRole('admin','manager'),                                    ctrl.updateStatus);

// ─── Payment Schedule ─────────────────────────────────────────────────────────
router.get(  '/:id/schedule',   requirePermission('bookings', 'view'),                             ctrl.getSchedule);
router.post( '/:id/schedule',   requireRole('admin','manager','accounts'), validate(addScheduleSchema),    ctrl.addSchedule);
router.delete('/:id/schedule/:sid', requireRole('admin'),                                          ctrl.removeSchedule);

module.exports = router;