const Joi = require('joi');

const createProjectSchema = Joi.object({
  name:                 Joi.string().min(2).max(200).required(),
  plot_number:          Joi.string().max(100).optional().allow('', null),
  sector_location:      Joi.string().max(200).optional().allow('', null),
  total_plot_area:      Joi.number().positive().optional().allow(null),
  area_unit:            Joi.string().valid('sqft', 'sqm', 'acre', 'gunta').default('sqft'),
  total_floors:         Joi.number().integer().min(1).optional().allow(null),
  total_flats:          Joi.number().integer().min(1).optional().allow(null),
  project_status:       Joi.string().valid('upcoming', 'active', 'completed', 'on_hold').default('upcoming'),
  launch_date:          Joi.date().iso().optional().allow(null),
  expected_completion:  Joi.date().iso().optional().allow(null),
  description:          Joi.string().max(1000).optional().allow('', null),
});

const updateProjectSchema = Joi.object({
  name:                 Joi.string().min(2).max(200),
  plot_number:          Joi.string().max(100).allow('', null),
  sector_location:      Joi.string().max(200).allow('', null),
  total_plot_area:      Joi.number().positive().allow(null),
  area_unit:            Joi.string().valid('sqft', 'sqm', 'acre', 'gunta'),
  total_floors:         Joi.number().integer().min(1).allow(null),
  total_flats:          Joi.number().integer().min(1).allow(null),
  project_status:       Joi.string().valid('upcoming', 'active', 'completed', 'on_hold'),
  launch_date:          Joi.date().iso().allow(null),
  expected_completion:  Joi.date().iso().allow(null),
  description:          Joi.string().max(1000).allow('', null),
}).min(1);

const addConfigSchema = Joi.object({
  config_name:  Joi.string()
                   .valid('Studio', '1 BHK', '1.5 BHK', '2 BHK', '2.5 BHK', '3 BHK', '4 BHK', 'Penthouse', 'Shop', 'Office')
                   .required(),
  total_units:  Joi.number().integer().min(0).default(0),
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

module.exports = { createProjectSchema, updateProjectSchema, addConfigSchema, validate };