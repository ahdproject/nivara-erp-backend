const router      = require('express').Router();
const ctrl        = require('./document.controller');
const upload      = require('./document.multer');
const { authenticate }      = require('../../middlewares/auth.middleware');
const { requireRole }       = require('../../middlewares/role.middleware');
const { requirePermission } = require('../../middlewares/processAccess.middleware');

router.use(authenticate);

// ─── Upload ───────────────────────────────────────────────────────────────────
// Single file upload — entity link passed in req.body
router.post(
  '/upload',
  requireRole('admin', 'manager', 'accounts'),
  upload.single('file'),          // field name must be "file" from multipart form
  ctrl.upload
);

// ─── Queries ──────────────────────────────────────────────────────────────────
router.get('/',                        requirePermission('documents', 'view'), ctrl.getAll);
router.get('/booking/:bookingId',      requirePermission('documents', 'view'), ctrl.getByBooking);
router.get('/customer/:customerId',    requirePermission('documents', 'view'), ctrl.getByCustomer);
router.get('/project/:projectId',      requirePermission('documents', 'view'), ctrl.getByProject);
router.get('/flat/:flatId',            requirePermission('documents', 'view'), ctrl.getByFlat);
router.get('/expense/:expenseId',      requirePermission('documents', 'view'), ctrl.getByExpense);

// ─── Single document ──────────────────────────────────────────────────────────
router.get('/:id',                     requirePermission('documents', 'view'), ctrl.getById);
router.get('/:id/download',            requirePermission('documents', 'view'), ctrl.download);
router.patch('/:id/label',             requireRole('admin', 'manager'),        ctrl.updateLabel);
router.delete('/:id',                  requireRole('admin'),                   ctrl.remove);

module.exports = router;