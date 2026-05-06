const Joi = require('joi');

const createCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
});

const createExpenseSchema = Joi.object({
  project_id:        Joi.number().integer().required(),
  category_id:       Joi.number().integer().required(),
  vendor_name:       Joi.string().max(200).optional().allow('', null),
  description:       Joi.string().max(1000).optional().allow('', null),
  expense_date:      Joi.date().iso().optional().allow(null),
  invoice_number:    Joi.string().max(100).optional().allow('', null),
  amount:            Joi.number().positive().required(),
  gst_amount:        Joi.number().min(0).default(0),
  payment_mode:      Joi.string()
                        .valid('cash', 'cheque', 'NEFT', 'RTGS', 'UPI')
                        .optional().allow(null),
  payment_reference: Joi.string().max(100).optional().allow('', null),
  remarks:           Joi.string().max(500).optional().allow('', null),
});

const updateExpenseSchema = Joi.object({
  category_id:       Joi.number().integer(),
  vendor_name:       Joi.string().max(200).allow('', null),
  description:       Joi.string().max(1000).allow('', null),
  expense_date:      Joi.date().iso().allow(null),
  invoice_number:    Joi.string().max(100).allow('', null),
  amount:            Joi.number().positive(),
  gst_amount:        Joi.number().min(0),
  payment_mode:      Joi.string().valid('cash', 'cheque', 'NEFT', 'RTGS', 'UPI').allow(null),
  payment_reference: Joi.string().max(100).allow('', null),
  remarks:           Joi.string().max(500).allow('', null),
}).min(1);

const payExpenseSchema = Joi.object({
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
  createCategorySchema, createExpenseSchema,
  updateExpenseSchema, payExpenseSchema,
  validate,
};