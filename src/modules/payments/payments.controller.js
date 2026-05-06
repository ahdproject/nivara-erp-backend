const svc          = require('./payments.service');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse  = require('../../utils/ApiResponse');

const record = asyncHandler(async (req, res) => {
  const data = await svc.record({ ...req.body, received_by: req.user.id });
  return ApiResponse.created(res, data, 'Payment recorded successfully');
});

const getAll = asyncHandler(async (req, res) => {
  const data = await svc.getAll(req.query);
  return ApiResponse.success(res, { payments: data, total: data.length });
});

const getById = asyncHandler(async (req, res) => {
  const data = await svc.getById(req.params.id);
  return ApiResponse.success(res, data);
});

const getByBooking = asyncHandler(async (req, res) => {
  const data = await svc.getByBooking(req.params.bookingId);
  return ApiResponse.success(res, { payments: data, total: data.length });
});

const getLedger = asyncHandler(async (req, res) => {
  const data = await svc.getLedger(req.params.bookingId);
  return ApiResponse.success(res, data);
});

const getOverdue = asyncHandler(async (req, res) => {
  const data = await svc.getOverdue(req.query);
  return ApiResponse.success(res, { overdue: data, total: data.length });
});

const getOutstanding = asyncHandler(async (req, res) => {
  const data = await svc.getOutstanding(req.query);
  return ApiResponse.success(res, { outstanding: data, total: data.length });
});

const getMonthlySummary = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year)
    return ApiResponse.error(res, 'month and year are required', 400);
  const data = await svc.getMonthlySummary(month, year);
  return ApiResponse.success(res, data);
});

const update = asyncHandler(async (req, res) => {
  const data = await svc.update(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Payment updated');
});

const remove = asyncHandler(async (req, res) => {
  await svc.remove(req.params.id);
  return ApiResponse.success(res, null, 'Payment deleted');
});

module.exports = {
  record, getAll, getById,
  getByBooking, getLedger,
  getOverdue, getOutstanding,
  getMonthlySummary,
  update, remove,
};