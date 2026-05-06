const svc          = require('./ledger.service');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse  = require('../../utils/ApiResponse');

const getAllCustomerSummaries = asyncHandler(async (req, res) => {
  const data = await svc.getAllCustomerSummaries(req.query);
  return ApiResponse.success(res, { customers: data, total: data.length });
});

const getCustomerLedger = asyncHandler(async (req, res) => {
  const data = await svc.getCustomerLedger(req.params.customerId);
  return ApiResponse.success(res, data);
});

const getStatement = asyncHandler(async (req, res) => {
  const data = await svc.getStatement(req.params.customerId, req.query);
  return ApiResponse.success(res, data);
});

const getBookingLedger = asyncHandler(async (req, res) => {
  const data = await svc.getBookingLedger(req.params.bookingId);
  return ApiResponse.success(res, data);
});

const getOverdueCustomers = asyncHandler(async (req, res) => {
  const data = await svc.getOverdueCustomers(req.query);
  return ApiResponse.success(res, { customers: data, total: data.length });
});

const getFullyPaidCustomers = asyncHandler(async (req, res) => {
  const data = await svc.getFullyPaidCustomers(req.query);
  return ApiResponse.success(res, { customers: data, total: data.length });
});

module.exports = {
  getAllCustomerSummaries,
  getCustomerLedger,
  getStatement,
  getBookingLedger,
  getOverdueCustomers,
  getFullyPaidCustomers,
};