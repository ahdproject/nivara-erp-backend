const router = require('express').Router();
const ctrl   = require('./projects.controller');
const { authenticate }      = require('../../middlewares/auth.middleware');
const { requireRole }       = require('../../middlewares/role.middleware');
const { requirePermission } = require('../../middlewares/processAccess.middleware');
const {
  validate,
  createProjectSchema,
  updateProjectSchema,
  addConfigSchema,
} = require('./projects.validation');

router.use(authenticate);

// ─── Projects ─────────────────────────────────────────────────────────────────
router.get(  '/',         requirePermission('projects', 'view'),                            ctrl.getAll);
router.get(  '/summary',  requirePermission('projects', 'view'),                            ctrl.getSummary);
router.get(  '/:id',      requirePermission('projects', 'view'),                            ctrl.getById);
router.post( '/',         requireRole('admin', 'manager'), validate(createProjectSchema),   ctrl.create);
router.put(  '/:id',      requireRole('admin', 'manager'), validate(updateProjectSchema),   ctrl.update);
router.delete('/:id',     requireRole('admin'),                                             ctrl.remove);

// ─── Configurations (1BHK / 2BHK etc.) per project ───────────────────────────
router.get(  '/:id/configurations',        requirePermission('projects', 'view'),                          ctrl.getConfigs);
router.post( '/:id/configurations',        requireRole('admin', 'manager'), validate(addConfigSchema),     ctrl.addConfig);
router.delete('/:id/configurations/:cid',  requireRole('admin'),                                           ctrl.removeConfig);

module.exports = router;