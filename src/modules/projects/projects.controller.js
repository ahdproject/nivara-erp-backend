const svc          = require('./projects.service');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse  = require('../../utils/ApiResponse');

const getAll = asyncHandler(async (req, res) => {
  const data = await svc.getAll(req.query);
  return ApiResponse.success(res, { projects: data, total: data.length });
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
  return ApiResponse.created(res, data, 'Project created successfully');
});

const update = asyncHandler(async (req, res) => {
  const data = await svc.update(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Project updated successfully');
});

const remove = asyncHandler(async (req, res) => {
  await svc.remove(req.params.id);
  return ApiResponse.success(res, null, 'Project deleted successfully');
});

// ─── Configurations ───────────────────────────────────────────────────────────
const getConfigs = asyncHandler(async (req, res) => {
  const data = await svc.getConfigs(req.params.id);
  return ApiResponse.success(res, { configurations: data });
});

const addConfig = asyncHandler(async (req, res) => {
  const data = await svc.addConfig(req.params.id, req.body);
  return ApiResponse.created(res, data, 'Configuration added');
});

const removeConfig = asyncHandler(async (req, res) => {
  await svc.removeConfig(req.params.id, req.params.cid);
  return ApiResponse.success(res, null, 'Configuration removed');
});

module.exports = {
  getAll, getSummary, getById,
  create, update, remove,
  getConfigs, addConfig, removeConfig,
};