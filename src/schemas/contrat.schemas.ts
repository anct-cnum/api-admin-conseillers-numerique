const Joi = require('@hapi/joi');

const validContrat = Joi.object({
  page: Joi.number().required().error(new Error('La pagination est invalide')),
  statut: Joi.string().required().error(new Error('Le statut est invalide')),
});

export default validContrat;
