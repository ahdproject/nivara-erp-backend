const Joi = require('joi');

// Validation for the body fields sent alongside the file upload
// Note: file itself is validated by multer (type + size)
const uploadBodySchema = Joi.object({
  doc_type:    Joi.string()
                  .valid('agreement','kyc','payment_receipt','approval','plan','noc','legal','marketing','other')
                  .required(),
  doc_label:   Joi.string().max(200).optional().allow('', null),
  project_id:  Joi.number().integer().optional().allow(null),
  booking_id:  Joi.number().integer().optional().allow(null),
  flat_id:     Joi.number().integer().optional().allow(null),
  customer_id: Joi.number().integer().optional().allow(null),
  expense_id:  Joi.number().integer().optional().allow(null),
}).or('project_id','booking_id','flat_id','customer_id','expense_id')  // at least one required
  .messages({
    'object.missing': 'At least one entity link (project_id, booking_id, flat_id, customer_id, or expense_id) is required',
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

module.exports = { uploadBodySchema, validate };