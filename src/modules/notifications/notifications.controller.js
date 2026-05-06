const svc          = require('./notifications.service');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse  = require('../../utils/ApiResponse');

const sendPaymentReceipt = asyncHandler(async (req, res) => {
  const data = await svc.sendPaymentReceipt(req.body, req.user.id);
  return ApiResponse.success(res, data, 'Payment receipt notification sent');
});

const sendPaymentReminder = asyncHandler(async (req, res) => {
  const data = await svc.sendPaymentReminder(req.body, req.user.id);
  return ApiResponse.success(res, data, 'Payment reminder sent');
});

const sendBookingConfirmation = asyncHandler(async (req, res) => {
  const data = await svc.sendBookingConfirmation(req.body, req.user.id);
  return ApiResponse.success(res, data, 'Booking confirmation sent');
});

const sendOverdueAlerts = asyncHandler(async (req, res) => {
  const data = await svc.sendOverdueAlerts(req.body, req.user.id);
  return ApiResponse.success(res, data, `Overdue alerts dispatched: ${data.sent} sent, ${data.failed} failed`);
});

const sendCustom = asyncHandler(async (req, res) => {
  const data = await svc.sendCustom(req.body, req.user.id);
  return ApiResponse.success(res, data, 'Custom message sent');
});

const getLog = asyncHandler(async (req, res) => {
  const data = await svc.getLog(req.query);
  return ApiResponse.success(res, { logs: data, total: data.length });
});

const getLogByBooking = asyncHandler(async (req, res) => {
  const data = await svc.getLogByEntity('booking_id', req.params.bookingId);
  return ApiResponse.success(res, { logs: data, total: data.length });
});

const getLogByCustomer = asyncHandler(async (req, res) => {
  const data = await svc.getLogByEntity('customer_id', req.params.customerId);
  return ApiResponse.success(res, { logs: data, total: data.length });
});

module.exports = {
  sendPaymentReceipt, sendPaymentReminder,
  sendBookingConfirmation, sendOverdueAlerts, sendCustom,
  getLog, getLogByBooking, getLogByCustomer,
};