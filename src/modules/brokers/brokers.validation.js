const Joi = require('joi');

const createBrokerSchema = Joi.object({
  name:           Joi.string().min(2).max(150).required(),
  phone:          Joi.string().pattern(/^[6-9]\d{9}$/).optional().allow('', null)
                     .messages({ 'string.pattern.base': 'Enter a valid 10-digit Indian mobile number' }),
  email:          Joi.string().email().optional().allow('', null),
  company:        Joi.string().max(200).optional().allow('', null),
  rera_number:    Joi.string().max(100).optional().allow('', null),
  commission_pct: Joi.number().min(0).max(20).default(0),
});

const updateBrokerSchema = Joi.object({
  name:           Joi.string().min(2).max(150),
  phone:          Joi.string().pattern(/^[6-9]\d{9}$/).allow('', null),
  email:          Joi.string().email().allow('', null),
  company:        Joi.string().max(200).allow('', null),
  rera_number:    Joi.string().max(100).allow('', null),
  commission_pct: Joi.number().min(0).max(20),
}).min(1);

const createCommissionSchema = Joi.object({
  booking_id:     Joi.number().integer().required(),
  commission_pct: Joi.number().min(0).max(20).required(),
  remarks:        Joi.string().max(500).optional().allow('', null),
});

const payCommissionSchema = Joi.object({
  amount:            Joi.number().positive().required(),
  payment_date:      Joi.date().iso().optional().allow(null),
  payment_mode:      Joi.string()
                        .valid('cash', 'cheque', 'NEFT', 'RTGS', 'UPI')
                        .required(),
  payment_reference: Joi.string().max(100).optional().allow('', null),
  remarks:           Joi.string().max(500).optional().allow('', null),
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
  createBrokerSchema, updateBrokerSchema,
  createCommissionSchema, payCommissionSchema,
  validate,
};