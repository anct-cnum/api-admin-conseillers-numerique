const Joi = require('@hapi/joi');

const validReconventionnement = Joi.object({
  page: Joi.number().required().error(new Error('La pagination est invalide')),
  type: Joi.string()
    .required()
    .error(new Error('Le type de convention est invalide')),
});

export default validReconventionnement;
