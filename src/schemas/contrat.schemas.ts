const Joi = require('@hapi/joi');

const validContrat = Joi.object({
  page: Joi.number().required().error(new Error('La pagination est invalide')),
  type: Joi.string()
    .required()
    .error(new Error('Le type de contrat est invalide')),
});

export default validContrat;
