const svc          = require('./flats.service');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse  = require('../../utils/ApiResponse');

const getAll = asyncHandler(async (req, res) => {
  const data = await svc.getAll(req.query);
  return ApiResponse.success(res, { flats: data, total: data.length });
});

const getStats = asyncHandler(async (req, res) => {
  const data = await svc.getStats(req.query.project_id);
  return ApiResponse.success(res, data);
});

const getById = asyncHandler(async (req, res) => {
  const data = await svc.getById(req.params.id);
  return ApiResponse.success(res, data);
});

const create = asyncHandler(async (req, res) => {
  const data = await svc.create(req.body);
  return ApiResponse.created(res, data, 'Flat added to inventory');
});

const bulkCreate = asyncHandler(async (req, res) => {
  const data = await svc.bulkCreate(req.body.flats);
  return ApiResponse.created(res, data, `${data.created} flats added successfully`);
});

const update = asyncHandler(async (req, res) => {
  const data = await svc.update(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Flat updated');
});

const updateStatus = asyncHandler(async (req, res) => {
  const data = await svc.updateStatus(req.params.id, req.body.status);
  return ApiResponse.success(res, data, `Flat marked as ${req.body.status}`);
});

const remove = asyncHandler(async (req, res) => {
  await svc.remove(req.params.id);
  return ApiResponse.success(res, null, 'Flat removed from inventory');
});

module.exports = { getAll, getStats, getById, create, bulkCreate, update, updateStatus, remove };