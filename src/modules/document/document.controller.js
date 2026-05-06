const svc          = require('./document.service');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse  = require('../../utils/ApiResponse');
const path         = require('path');
const fs           = require('fs');

const upload = asyncHandler(async (req, res) => {
  if (!req.file)
    return ApiResponse.error(res, 'No file received. Send file as multipart/form-data field named "file"', 400);

  const data = await svc.save(req.file, req.body, req.user.id);
  return ApiResponse.created(res, data, 'Document uploaded successfully');
});

const getAll = asyncHandler(async (req, res) => {
  const data = await svc.getAll(req.query);
  return ApiResponse.success(res, { documents: data, total: data.length });
});

const getById = asyncHandler(async (req, res) => {
  const data = await svc.getById(req.params.id);
  return ApiResponse.success(res, data);
});

const getByBooking = asyncHandler(async (req, res) => {
  const data = await svc.getByEntity('booking_id', req.params.bookingId);
  return ApiResponse.success(res, { documents: data, total: data.length });
});

const getByCustomer = asyncHandler(async (req, res) => {
  const data = await svc.getByEntity('customer_id', req.params.customerId);
  return ApiResponse.success(res, { documents: data, total: data.length });
});

const getByProject = asyncHandler(async (req, res) => {
  const data = await svc.getByEntity('project_id', req.params.projectId);
  return ApiResponse.success(res, { documents: data, total: data.length });
});

const getByFlat = asyncHandler(async (req, res) => {
  const data = await svc.getByEntity('flat_id', req.params.flatId);
  return ApiResponse.success(res, { documents: data, total: data.length });
});

const getByExpense = asyncHandler(async (req, res) => {
  const data = await svc.getByEntity('expense_id', req.params.expenseId);
  return ApiResponse.success(res, { documents: data, total: data.length });
});

const download = asyncHandler(async (req, res) => {
  const doc = await svc.getById(req.params.id);

  const absPath = path.join(__dirname, '..', '..', '..', doc.file_path);
  if (!fs.existsSync(absPath))
    return ApiResponse.error(res, 'File not found on server', 404);

  res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name}"`);
  res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
  res.sendFile(absPath);
});

const updateLabel = asyncHandler(async (req, res) => {
  const { doc_label } = req.body;
  if (!doc_label) return ApiResponse.error(res, 'doc_label is required', 400);
  const data = await svc.updateLabel(req.params.id, doc_label);
  return ApiResponse.success(res, data, 'Document label updated');
});

const remove = asyncHandler(async (req, res) => {
  await svc.remove(req.params.id);
  return ApiResponse.success(res, null, 'Document deleted');
});

module.exports = {
  upload,
  getAll, getById,
  getByBooking, getByCustomer, getByProject, getByFlat, getByExpense,
  download, updateLabel, remove,
};