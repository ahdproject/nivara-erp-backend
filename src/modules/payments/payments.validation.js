const Joi = require('joi');

const recordPaymentSchema = Joi.object({
  booking_id:   Joi.number().integer().required(),
  schedule_id:  Joi.number().integer().optional().allow(null),
  payment_date: Joi.date().iso().optional().allow(null),
  amount:       Joi.number().positive().required(),
  payment_type: Joi.string()
                   .valid('booking', 'agreement', 'instalment', 'registration', 'other')
                   .required(),
  payment_mode: Joi.string()
                   .valid('cash', 'cheque', 'NEFT', 'RTGS', 'UPI')
                   .required(),
  reference_no: Joi.string().max(100).optional().allow('', null),
  bank_name:    Joi.string().max(150).optional().allow('', null),
  remarks:      Joi.string().max(500).optional().allow('', null),
});

const updatePaymentSchema = Joi.object({
  payment_date: Joi.date().iso(),
  payment_type: Joi.string().valid('booking', 'agreement', 'instalment', 'registration', 'other'),
  payment_mode: Joi.string().valid('cash', 'cheque', 'NEFT', 'RTGS', 'UPI'),
  reference_no: Joi.string().max(100).allow('', null),
  bank_name:    Joi.string().max(150).allow('', null),
  remarks:      Joi.string().max(500).allow('', null),
}).min(1);

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

module.exports = { recordPaymentSchema, updatePaymentSchema, validate };