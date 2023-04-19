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

const updateReconventionnement = Joi.object({
  action: Joi.string()
    .trim()
    .required()
    .error(new Error("Le type d'action est invalide")),
  structureId: Joi.string()
    .required()
    .error(new Error("L'identifiant de structure est invalide")),
  nombreDePostes: Joi.string().error(
    new Error('Le nombre de postes est invalide'),
  ),
  motif: Joi.string().allow(null, '').error(new Error('Le motif est invalide')),
  conseillers: Joi.array()
    .items(Joi.object())
    .error(new Error('Les conseillers sont invalides')),
});

export {
  validReconventionnement,
  validHistoriqueConvention,
  updateReconventionnement,
};
