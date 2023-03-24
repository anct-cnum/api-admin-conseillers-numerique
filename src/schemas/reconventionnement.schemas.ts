const Joi = require('@hapi/joi');

const validReconventionnement = Joi.object({
  page: Joi.number().required().error(new Error('La pagination est invalide')),
  type: Joi.string()
    .required()
    .error(new Error('Le type de convention est invalide')),
});

const validHistoriqueConvention = Joi.object({
  page: Joi.number().error(new Error('La pagination est invalide')),
  type: Joi.string()
    .required()
    .error(new Error('Le type de convention est invalide')),
  dateDebut: Joi.date()
    .required()
    .error(new Error('La date de début est invalide')),
  dateFin: Joi.date()
    .required()
    .error(new Error('La date de fin est invalide')),
});

export { validReconventionnement, validHistoriqueConvention };
