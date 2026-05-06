const Joi = require('joi');

const createCustomerSchema = Joi.object({
  name:           Joi.string().min(2).max(200).required(),
  phone:          Joi.string().pattern(/^[6-9]\d{9}$/).optional().allow('', null)
                     .messages({ 'string.pattern.base': 'Enter a valid 10-digit Indian mobile number' }),
  email:          Joi.string().email().optional().allow('', null),
  pan_number:     Joi.string().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional().allow('', null)
                     .messages({ 'string.pattern.base': 'Enter a valid PAN number (e.g. ABCDE1234F)' }),
  aadhaar_number: Joi.string().pattern(/^\d{12}$/).optional().allow('', null)
                     .messages({ 'string.pattern.base': 'Aadhaar must be 12 digits' }),
  address:        Joi.string().max(500).optional().allow('', null),
});

const updateCustomerSchema = createCustomerSchema.fork(
  ['name'], (schema) => schema.optional()
).min(1);

const scheduleItem = Joi.object({
  milestone:  Joi.string().max(200).required(),
  due_date:   Joi.date().iso().optional().allow(null),
  amount_due: Joi.number().positive().required(),
});

const createBookingSchema = Joi.object({
  project_id:        Joi.number().integer().required(),
  flat_id:           Joi.number().integer().required(),
  customer_id:       Joi.number().integer().required(),
  broker_id:         Joi.number().integer().optional().allow(null),
  booking_date:      Joi.date().iso().optional().allow(null),
  booking_amount:    Joi.number().positive().required(),
  agreement_value:   Joi.number().positive().optional().allow(null),
  discount:          Joi.number().min(0).default(0),
  remarks:           Joi.string().max(500).optional().allow('', null),
  payment_schedules: Joi.array().items(scheduleItem).optional().default([]),
});

const updateBookingSchema = Joi.object({
  booking_date:    Joi.date().iso(),
  booking_amount:  Joi.number().positive(),
  agreement_value: Joi.number().positive().allow(null),
  discount:        Joi.number().min(0),
  final_value:     Joi.number().positive().allow(null),
  broker_id:       Joi.number().integer().allow(null),
  remarks:         Joi.string().max(500).allow('', null),
}).min(1);

const cancelBookingSchema = Joi.object({
  cancellation_reason: Joi.string().max(500).optional().allow('', null),
});

const addScheduleSchema = Joi.object({
  milestone:  Joi.string().max(200).required(),
  due_date:   Joi.date().iso().optional().allow(null),
  amount_due: Joi.number().positive().required(),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors:  error.details.map((d) => d.message),
    });
  }
  next();
};

module.exports = {
  createCustomerSchema, updateCustomerSchema,
  createBookingSchema, updateBookingSchema,
  cancelBookingSchema, addScheduleSchema,
  validate,
};