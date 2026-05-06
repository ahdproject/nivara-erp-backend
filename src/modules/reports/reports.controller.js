const svc          = require('./reports.service');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse  = require('../../utils/ApiResponse');

const getDashboard = asyncHandler(async (req, res) => {
  const data = await svc.getDashboard();
  return ApiResponse.success(res, data);
});

const getProjectReport = asyncHandler(async (req, res) => {
  const data = await svc.getProjectReport(req.params.projectId);
  return ApiResponse.success(res, data);
});

const getSalesReport = asyncHandler(async (req, res) => {
  const data = await svc.getSalesReport(req.query);
  return ApiResponse.success(res, data);
});

const getMonthlySales = asyncHandler(async (req, res) => {
  const { year } = req.query;
  if (!year) return ApiResponse.error(res, 'year is required', 400);
  const data = await svc.getMonthlySales(year);
  return ApiResponse.success(res, data);
});

const getCollectionReport = asyncHandler(async (req, res) => {
  const data = await svc.getCollectionReport(req.query);
  return ApiResponse.success(res, data);
});

const getMonthlyCollections = asyncHandler(async (req, res) => {
  const { year } = req.query;
  if (!year) return ApiResponse.error(res, 'year is required', 400);
  const data = await svc.getMonthlyCollections(year);
  return ApiResponse.success(res, data);
});

const getExpenseReport = asyncHandler(async (req, res) => {
  const data = await svc.getExpenseReport(req.query);
  return ApiResponse.success(res, data);
});

const getBrokerPerformance = asyncHandler(async (req, res) => {
  const data = await svc.getBrokerPerformance(req.query);
  return ApiResponse.success(res, data);
});

const getInventorySnapshot = asyncHandler(async (req, res) => {
  const data = await svc.getInventorySnapshot(req.query);
  return ApiResponse.success(res, data);
});

module.exports = {
  getDashboard,
  getProjectReport,
  getSalesReport, getMonthlySales,
  getCollectionReport, getMonthlyCollections,
  getExpenseReport,
  getBrokerPerformance,
  getInventorySnapshot,
};