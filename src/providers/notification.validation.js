const Joi = require('joi');

const sendReceiptSchema = Joi.object({
  booking_id: Joi.number().integer().required(),
  payment_id: Joi.number().integer().when('type', {
    is: 'payment_receipt', then: Joi.required(), otherwise: Joi.optional(),
  }),
  channel: Joi.string().valid('whatsapp', 'email', 'both').default('both'),
});

const sendReminderSchema = Joi.object({
  booking_id: Joi.number().integer().required(),
  schedule_id: Joi.number().integer().required(),
  channel: Joi.string().valid('whatsapp', 'email', 'both').default('both'),
});

const sendCustomSchema = Joi.object({
  booking_id: Joi.number().integer().optional().allow(null),
  customer_id: Joi.number().integer().optional().allow(null),
  channel: Joi.string().valid('whatsapp', 'email', 'both').required(),
  message: Joi.string().min(5).max(1000).required(),
  subject: Joi.string().max(200).optional().allow('', null),
})
  .or('booking_id', 'customer_id')
  .messages({ 'object.missing': 'Either booking_id or customer_id is required' });

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map((d) => d.message),
    });
  }
  next();
};

module.exports = { sendReceiptSchema, sendReminderSchema, sendCustomSchema, validate };
