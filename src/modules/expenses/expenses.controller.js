const svc          = require('./expenses.service');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse  = require('../../utils/ApiResponse');

// ─── Categories ───────────────────────────────────────────────────────────────
const getCategories = asyncHandler(async (req, res) => {
  const data = await svc.getCategories();
  return ApiResponse.success(res, { categories: data, total: data.length });
});

const createCategory = asyncHandler(async (req, res) => {
  const data = await svc.createCategory(req.body);
  return ApiResponse.created(res, data, 'Expense category created');
});

const deactivateCategory = asyncHandler(async (req, res) => {
  const data = await svc.deactivateCategory(req.params.cid);
  return ApiResponse.success(res, data, 'Category deactivated');
});

// ─── Expenses ─────────────────────────────────────────────────────────────────
const getAll = asyncHandler(async (req, res) => {
  const data = await svc.getAll(req.query);
  return ApiResponse.success(res, { expenses: data, total: data.length });
});

const getSummary = asyncHandler(async (req, res) => {
  const data = await svc.getSummary(req.query);
  return ApiResponse.success(res, data);
});

const getUnpaid = asyncHandler(async (req, res) => {
  const data = await svc.getUnpaid(req.query);
  return ApiResponse.success(res, { expenses: data, total: data.length });
});

const getByProject = asyncHandler(async (req, res) => {
  const data = await svc.getByProject(req.params.projectId, req.query);
  return ApiResponse.success(res, data);
});

const getById = asyncHandler(async (req, res) => {
  const data = await svc.getById(req.params.id);
  return ApiResponse.success(res, data);
});

const create = asyncHandler(async (req, res) => {
  const data = await svc.create({ ...req.body, created_by: req.user.id });
  return ApiResponse.created(res, data, 'Expense recorded successfully');
});

const update = asyncHandler(async (req, res) => {
  const data = await svc.update(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Expense updated');
});

const remove = asyncHandler(async (req, res) => {
  await svc.remove(req.params.id);
  return ApiResponse.success(res, null, 'Expense deleted');
});

// ─── Expense Payments ─────────────────────────────────────────────────────────
const pay = asyncHandler(async (req, res) => {
  const data = await svc.pay(req.params.id, req.body, req.user.id);
  return ApiResponse.success(res, data, 'Payment recorded against expense');
});

const getPayments = asyncHandler(async (req, res) => {
  const data = await svc.getPayments(req.params.id);
  return ApiResponse.success(res, { payments: data, total: data.length });
});

module.exports = {
  getCategories, createCategory, deactivateCategory,
  getAll, getSummary, getUnpaid, getByProject,
  getById, create, update, remove,
  pay, getPayments,
};