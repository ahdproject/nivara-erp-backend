const Joi = require('joi');

const customerSchema = Joi.object({
  name: Joi.string().required(),
  phone: Joi.string().required(),
  email: Joi.string().email().required(),
  pan: Joi.string(),
  aadhaar: Joi.string(),
});

module.exports = {
  customerSchema,
};
