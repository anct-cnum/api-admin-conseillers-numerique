const Joi = require('@hapi/joi');

const validContrat = Joi.object({
  page: Joi.number().required().error(new Error('La pagination est invalide')),
  statut: Joi.string().required().error(new Error('Le statut est invalide')),
});

const validHistoriqueContrat = Joi.object({
  page: Joi.number().error(new Error('La pagination est invalide')),
  statut: Joi.string().required().error(new Error('Le statut est invalide')),
  dateDebut: Joi.date()
    .required()
    .error(new Error('La date de début est invalide')),
  dateFin: Joi.date()
    .required()
    .error(new Error('La date de fin est invalide')),
});

export { validContrat, validHistoriqueContrat };
