const svc          = require('./bookings.service');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse  = require('../../utils/ApiResponse');

// ─── Customers ────────────────────────────────────────────────────────────────
const getAllCustomers = asyncHandler(async (req, res) => {
  const data = await svc.getAllCustomers(req.query);
  return ApiResponse.success(res, { customers: data, total: data.length });
});

const getCustomerById = asyncHandler(async (req, res) => {
  const data = await svc.getCustomerById(req.params.id);
  return ApiResponse.success(res, data);
});

const createCustomer = asyncHandler(async (req, res) => {
  const data = await svc.createCustomer(req.body);
  return ApiResponse.created(res, data, 'Customer created successfully');
});

const updateCustomer = asyncHandler(async (req, res) => {
  const data = await svc.updateCustomer(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Customer updated');
});

// ─── Bookings ─────────────────────────────────────────────────────────────────
const getAll = asyncHandler(async (req, res) => {
  const data = await svc.getAll(req.query);
  return ApiResponse.success(res, { bookings: data, total: data.length });
});

const getById = asyncHandler(async (req, res) => {
  const data = await svc.getById(req.params.id);
  return ApiResponse.success(res, data);
});

const create = asyncHandler(async (req, res) => {
  const data = await svc.create({ ...req.body, created_by: req.user.id });
  return ApiResponse.created(res, data, 'Booking created successfully');
});

const update = asyncHandler(async (req, res) => {
  const data = await svc.update(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Booking updated');
});

const cancel = asyncHandler(async (req, res) => {
  const data = await svc.cancel(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Booking cancelled and flat set to available');
});

const updateStatus = asyncHandler(async (req, res) => {
  const data = await svc.updateStatus(req.params.id, req.body.status);
  return ApiResponse.success(res, data, `Booking status updated to ${req.body.status}`);
});

// ─── Payment Schedule ─────────────────────────────────────────────────────────
const getSchedule = asyncHandler(async (req, res) => {
  const data = await svc.getSchedule(req.params.id);
  return ApiResponse.success(res, { schedule: data, total: data.length });
});

const addSchedule = asyncHandler(async (req, res) => {
  const data = await svc.addSchedule(req.params.id, req.body);
  return ApiResponse.created(res, data, 'Milestone added to payment schedule');
});

const removeSchedule = asyncHandler(async (req, res) => {
  await svc.removeSchedule(req.params.id, req.params.sid);
  return ApiResponse.success(res, null, 'Schedule milestone removed');
});

module.exports = {
  getAllCustomers, getCustomerById, createCustomer, updateCustomer,
  getAll, getById, create, update, cancel, updateStatus,
  getSchedule, addSchedule, removeSchedule,
};