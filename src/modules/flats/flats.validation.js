const Joi = require('joi');

const flatBody = {
  project_id:    Joi.number().integer().required(),
  flat_number:   Joi.string().max(50).required(),
  floor:         Joi.number().integer().min(0).required(),
  configuration: Joi.string()
                    .valid('Studio', '1 BHK', '1.5 BHK', '2 BHK', '2.5 BHK', '3 BHK', '4 BHK', 'Penthouse', 'Shop', 'Office')
                    .required(),
  carpet_area:   Joi.number().positive().optional().allow(null),
  saleable_area: Joi.number().positive().optional().allow(null),
  area_unit:     Joi.string().valid('sqft', 'sqm').default('sqft'),
  base_price:    Joi.number().positive().optional().allow(null),
  total_price:   Joi.number().positive().optional().allow(null),
  facing:        Joi.string().valid('East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West').optional().allow(null),
  parking:       Joi.string().valid('covered', 'open', 'none').optional().allow(null),
  remarks:       Joi.string().max(500).optional().allow('', null),
};

const createFlatSchema = Joi.object(flatBody);

const updateFlatSchema = Joi.object({
  flat_number:   Joi.string().max(50),
  floor:         Joi.number().integer().min(0),
  configuration: Joi.string().valid('Studio', '1 BHK', '1.5 BHK', '2 BHK', '2.5 BHK', '3 BHK', '4 BHK', 'Penthouse', 'Shop', 'Office'),
  carpet_area:   Joi.number().positive().allow(null),
  saleable_area: Joi.number().positive().allow(null),
  area_unit:     Joi.string().valid('sqft', 'sqm'),
  base_price:    Joi.number().positive().allow(null),
  total_price:   Joi.number().positive().allow(null),
  facing:        Joi.string().valid('East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West').allow(null),
  parking:       Joi.string().valid('covered', 'open', 'none').allow(null),
  remarks:       Joi.string().max(500).allow('', null),
}).min(1);

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('available', 'blocked', 'sold').required(),
});

const bulkCreateFlatSchema = Joi.object({
  flats: Joi.array().items(Joi.object(flatBody)).min(1).max(500).required(),
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
  createFlatSchema, updateFlatSchema,
  updateStatusSchema, bulkCreateFlatSchema,
  validate,
};