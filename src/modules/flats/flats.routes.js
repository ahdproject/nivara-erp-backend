const router      = require('express').Router();
const ctrl        = require('./flats.controller');
const { authenticate }      = require('../../middlewares/auth.middleware');
const { requireRole }       = require('../../middlewares/role.middleware');
const { requirePermission } = require('../../middlewares/processAccess.middleware');
const {
  validate,
  createFlatSchema,
  updateFlatSchema,
  updateStatusSchema,
  bulkCreateFlatSchema,
} = require('./flats.validation');

router.use(authenticate);

// ─── Flat CRUD ────────────────────────────────────────────────────────────────
router.get(   '/',          requirePermission('flats', 'view'),                            ctrl.getAll);
router.get(   '/stats',     requirePermission('flats', 'view'),                            ctrl.getStats);
router.get(   '/:id',       requirePermission('flats', 'view'),                            ctrl.getById);
router.post(  '/',          requireRole('admin', 'manager'), validate(createFlatSchema),   ctrl.create);
router.post(  '/bulk',      requireRole('admin', 'manager'), validate(bulkCreateFlatSchema), ctrl.bulkCreate);
router.put(   '/:id',       requireRole('admin', 'manager'), validate(updateFlatSchema),   ctrl.update);
router.patch( '/:id/status',requireRole('admin', 'manager'), validate(updateStatusSchema), ctrl.updateStatus);
router.delete('/:id',       requireRole('admin'),                                          ctrl.remove);

module.exports = router;