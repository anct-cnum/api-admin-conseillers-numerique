const Joi = require('@hapi/joi');

const validContrat = Joi.object({
  page: Joi.number().required().error(new Error('La pagination est invalide')),
  statut: Joi.string().required().error(new Error('Le statut est invalide')),
});

const validCreationContrat = Joi.object({
  dateDebutDeContrat: Joi.date()
    .required()
    .error(new Error('La date de début de contrat est invalide')),
  dateFinDeContrat: Joi.date()
    .required()
    .error(new Error('La date de fin de contrat est invalide')),
  typeDeContrat: Joi.string()
    .required()
    .error(new Error('Le type de contrat est invalide')),
  salaire: Joi.number()
    .required()
    .error(new Error('Le salaire du contrat est invalide')),
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

export { validContrat, validHistoriqueContrat, validCreationContrat };
