const svc          = require('./brokers.service');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse  = require('../../utils/ApiResponse');

// ─── Brokers ──────────────────────────────────────────────────────────────────
const getAll = asyncHandler(async (req, res) => {
  const data = await svc.getAll(req.query);
  return ApiResponse.success(res, { brokers: data, total: data.length });
});

const getSummary = asyncHandler(async (req, res) => {
  const data = await svc.getSummary();
  return ApiResponse.success(res, data);
});

const getById = asyncHandler(async (req, res) => {
  const data = await svc.getById(req.params.id);
  return ApiResponse.success(res, data);
});

const create = asyncHandler(async (req, res) => {
  const data = await svc.create({ ...req.body, created_by: req.user.id });
  return ApiResponse.created(res, data, 'Broker created successfully');
});

const update = asyncHandler(async (req, res) => {
  const data = await svc.update(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Broker updated');
});

const deactivate = asyncHandler(async (req, res) => {
  const data = await svc.setActive(req.params.id, false);
  return ApiResponse.success(res, data, 'Broker deactivated');
});

const activate = asyncHandler(async (req, res) => {
  const data = await svc.setActive(req.params.id, true);
  return ApiResponse.success(res, data, 'Broker activated');
});

// ─── Commissions ──────────────────────────────────────────────────────────────
const getAllCommissions = asyncHandler(async (req, res) => {
  const data = await svc.getAllCommissions(req.query);
  return ApiResponse.success(res, { commissions: data, total: data.length });
});

const getPendingCommissions = asyncHandler(async (req, res) => {
  const data = await svc.getPendingCommissions(req.query);
  return ApiResponse.success(res, { commissions: data, total: data.length });
});

const getBrokerCommissions = asyncHandler(async (req, res) => {
  const data = await svc.getBrokerCommissions(req.params.id, req.query);
  return ApiResponse.success(res, { commissions: data, total: data.length });
});

const getBrokerCommissionSummary = asyncHandler(async (req, res) => {
  const data = await svc.getBrokerCommissionSummary(req.params.id);
  return ApiResponse.success(res, data);
});

const createCommission = asyncHandler(async (req, res) => {
  const data = await svc.createCommission(
    req.params.id,
    req.body,
    req.user.id
  );
  return ApiResponse.created(res, data, 'Commission record created');
});

const payCommission = asyncHandler(async (req, res) => {
  const data = await svc.payCommission(
    req.params.id,
    req.params.cid,
    req.body,
    req.user.id
  );
  return ApiResponse.success(res, data, 'Commission payment recorded');
});

const getCommissionPayments = asyncHandler(async (req, res) => {
  const data = await svc.getCommissionPayments(req.params.cid);
  return ApiResponse.success(res, { payments: data, total: data.length });
});

module.exports = {
  getAll, getSummary, getById, create, update, deactivate, activate,
  getAllCommissions, getPendingCommissions,
  getBrokerCommissions, getBrokerCommissionSummary,
  createCommission, payCommission, getCommissionPayments,
};