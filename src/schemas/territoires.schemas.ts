const Joi = require('joi');

const validTerritoires = Joi.object({
  page: Joi.number()
    .required()
    .error(new Error('Le numéro de page est invalide')),
  territoire: Joi.string()
    .required()
    .error(new Error('Le type de territoire est invalide')),
  dateDebut: Joi.date()
    .required()
    .error(new Error('La date de début est invalide')),
  dateFin: Joi.date()
    .required()
    .error(new Error('La date de fin est invalide')),
  nomOrdre: Joi.string()
    .required()
    .error(new Error('Le nom du tri est invalide')),
  ordre: Joi.number().required().error(new Error('Le tri est invalide')),
});

const validTerritoiresPrefet = Joi.object({
  territoire: Joi.string()
    .required()
    .error(new Error('Le type de territoire est invalide')),
  dateDebut: Joi.date()
    .required()
    .error(new Error('La date de début est invalide')),
  dateFin: Joi.date()
    .required()
    .error(new Error('La date de fin est invalide')),
  nomOrdre: Joi.string()
    .required()
    .error(new Error('Le nom du tri est invalide')),
  ordre: Joi.number().required().error(new Error('Le tri est invalide')),
});

const validExportTerritoires = Joi.object({
  territoire: Joi.string()
    .required()
    .error(new Error('Le type de territoire est invalide')),
  dateDebut: Joi.date()
    .required()
    .error(new Error('La date de début est invalide')),
  dateFin: Joi.date()
    .required()
    .error(new Error('La date de fin est invalide')),
  nomOrdre: Joi.string()
    .required()
    .error(new Error('Le nom du tri est invalide')),
  ordre: Joi.number().required().error(new Error('Le tri est invalide')),
});

const validTerritoireDetails = Joi.object({
  typeTerritoire: Joi.string()
    .required()
    .error(new Error('Le type de territoire est invalide')),
  idTerritoire: Joi.string()
    .min(2)
    .max(3)
    .required()
    .error(new Error("L'id du territoire est invalide")),
  dateFin: Joi.date()
    .required()
    .error(new Error('La date de fin est invalide')),
});

const validTerritoireCra = Joi.object({
  conseillerIds: Joi.array()
    .items(Joi.string())
    .required()
    .error(new Error('Le tableau des conseillers est invalide')),
  dateDebut: Joi.date()
    .required()
    .error(new Error('La date de début est invalide')),
  dateFin: Joi.date()
    .required()
    .error(new Error('La date de fin est invalide')),
});

export {
  validTerritoires,
  validTerritoireDetails,
  validTerritoireCra,
  validExportTerritoires,
  validTerritoiresPrefet,
};
