const Joi = require('joi');

const validContrat = Joi.object({
  page: Joi.number().required().error(new Error('La pagination est invalide')),
  statut: Joi.string().required().error(new Error('Le statut est invalide')),
  ordre: Joi.number().required().error(new Error('Le tri est invalide')),
  nomOrdre: Joi.string()
    .required()
    .error(new Error('Le nom du tri est invalide')),
  searchByNomConseiller: Joi.string().error(
    new Error('La recherche par nom de la conseiller est invalide'),
  ),
});

const validCreationContrat = Joi.object({
  dateDebutDeContrat: Joi.date()
    .required()
    .error(new Error('La date de début de contrat est invalide')),
  dateFinDeContrat: Joi.date()
    .required()
    .allow(null, '')
    .error(new Error('La date de fin de contrat est invalide')),
  typeDeContrat: Joi.string()
    .required()
    .error(new Error('Le type de contrat est invalide')),
  salaire: Joi.string()
    .regex(/^(\d+(?:[\\.\\,]\d*)?)$/)
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
  ordre: Joi.number().required().error(new Error('Le tri est invalide')),
  nomOrdre: Joi.string()
    .required()
    .error(new Error('Le nom du tri est invalide')),
  searchByNomConseiller: Joi.string().error(
    new Error('La recherche par nom de la conseiller est invalide'),
  ),
});

export { validContrat, validHistoriqueContrat, validCreationContrat };
