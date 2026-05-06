const router      = require('express').Router();
const ctrl        = require('./expenses.controller');
const { authenticate }      = require('../../middlewares/auth.middleware');
const { requireRole }       = require('../../middlewares/role.middleware');
const { requirePermission } = require('../../middlewares/processAccess.middleware');
const {
  validate,
  createExpenseSchema,
  updateExpenseSchema,
  payExpenseSchema,
  createCategorySchema,
} = require('./expenses.validation');

router.use(authenticate);

// ─── Specific routes FIRST (before /:id) ──────────────────────────────────────
router.get( '/categories',            requirePermission('expenses', 'view'),                              ctrl.getCategories);
router.post('/categories',            requireRole('admin', 'manager'),         validate(createCategorySchema), ctrl.createCategory);
router.patch('/categories/:cid/deactivate', requireRole('admin'),                                         ctrl.deactivateCategory);

router.get( '/summary',               requirePermission('expenses', 'view'),                              ctrl.getSummary);
router.get( '/unpaid',                requirePermission('expenses', 'view'),                              ctrl.getUnpaid);
router.get( '/by-project/:projectId', requirePermission('expenses', 'view'),                              ctrl.getByProject);

// ─── Expense CRUD ─────────────────────────────────────────────────────────────
router.get(  '/',         requirePermission('expenses', 'view'),                                          ctrl.getAll);
router.get(  '/:id',      requirePermission('expenses', 'view'),                                          ctrl.getById);
router.post( '/',         requireRole('admin', 'manager', 'accounts'), validate(createExpenseSchema),     ctrl.create);
router.put(  '/:id',      requireRole('admin', 'manager'),             validate(updateExpenseSchema),     ctrl.update);
router.delete('/:id',     requireRole('admin'),                                                           ctrl.remove);

// ─── Expense payments (partial/full) ─────────────────────────────────────────
router.post( '/:id/pay',          requireRole('admin', 'manager', 'accounts'), validate(payExpenseSchema), ctrl.pay);
router.get(  '/:id/payments',     requirePermission('expenses', 'view'),                                   ctrl.getPayments);

module.exports = router;