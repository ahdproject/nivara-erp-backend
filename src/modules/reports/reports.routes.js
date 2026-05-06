const router      = require('express').Router();
const ctrl        = require('./reports.controller');
const { authenticate }      = require('../../middlewares/auth.middleware');
const { requirePermission } = require('../../middlewares/processAccess.middleware');

router.use(authenticate);
router.use(requirePermission('reports', 'view'));

// ─── Main Dashboard ───────────────────────────────────────────────────────────
router.get('/dashboard',            ctrl.getDashboard);

// ─── Project-level Reports ────────────────────────────────────────────────────
router.get('/project/:projectId',   ctrl.getProjectReport);

// ─── Sales Reports ────────────────────────────────────────────────────────────
router.get('/sales',                ctrl.getSalesReport);
router.get('/sales/monthly',        ctrl.getMonthlySales);

// ─── Collection Reports ───────────────────────────────────────────────────────
router.get('/collections',          ctrl.getCollectionReport);
router.get('/collections/monthly',  ctrl.getMonthlyCollections);

// ─── Expense Reports ──────────────────────────────────────────────────────────
router.get('/expenses',             ctrl.getExpenseReport);

// ─── Broker Performance ───────────────────────────────────────────────────────
router.get('/broker-performance',   ctrl.getBrokerPerformance);

// ─── Flat Inventory Snapshot ─────────────────────────────────────────────────
router.get('/inventory',            ctrl.getInventorySnapshot);

module.exports = router;