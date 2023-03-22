const Joi = require('@hapi/joi');

const validStatNationales = Joi.object({
  dateDebut: Joi.date()
    .required()
    .error(new Error('La date de début est invalide')),
  dateFin: Joi.date()
    .required()
    .error(new Error('La date de fin est invalide')),
});

const validStatConseiller = Joi.object({
  dateDebut: Joi.date()
    .required()
    .error(new Error('La date de début est invalide')),
  dateFin: Joi.date()
    .required()
    .error(new Error('La date de fin est invalide')),
  idConseiller: Joi.string()
    .hex()
    .length(24)
    .error(new Error("L'id du conseiller est invalide")),
});

const validStatStructure = Joi.object({
  dateDebut: Joi.date()
    .required()
    .error(new Error('La date de début est invalide')),
  dateFin: Joi.date()
    .required()
    .error(new Error('La date de fin est invalide')),
  idStructure: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .error(new Error("L'id de la structure est invalide")),
});

const validStatGrandReseau = Joi.object({
  dateDebut: Joi.date()
    .required()
    .error(new Error('La date de début est invalide')),
  dateFin: Joi.date()
    .required()
    .error(new Error('La date de fin est invalide')),
  conseillerIds: Joi.array()
    .items(Joi.string())
    .error(new Error('Le tableau des conseillers est invalide')),
  structureIds: Joi.array()
    .items(Joi.string())
    .error(new Error('Le tableau des structures est invalide')),
  codePostal: Joi.string()
    .allow('')
    .error(new Error('Le filtre code postal est invalide')),
  ville: Joi.string()
    .allow('')
    .error(new Error('Le filtre ville est invalide')),
  codeRegion: Joi.string()
    .allow('')
    .error(new Error('Le filtre code region est invalide')),
  numeroDepartement: Joi.string()
    .allow('')
    .error(new Error('Le filtre numéro de département est invalide')),
});

const validStatCsv = Joi.object({
  dateDebut: Joi.date()
    .required()
    .error(new Error('La date de début est invalide')),
  dateFin: Joi.date()
    .required()
    .error(new Error('La date de fin est invalide')),
  conseillerIds: Joi.array()
    .items(Joi.string())
    .error(new Error('Le tableau des conseillers est invalide')),
  structureIds: Joi.array()
    .items(Joi.string())
    .error(new Error('Le tableau des structures est invalide')),
  codePostal: Joi.string()
    .allow('')
    .error(new Error('Le filtre code postal est invalide')),
  ville: Joi.string()
    .allow('')
    .error(new Error('Le filtre ville est invalide')),
  codeRegion: Joi.string()
    .allow('')
    .error(new Error('Le filtre code region est invalide')),
  numeroDepartement: Joi.string()
    .allow('')
    .error(new Error('Le filtre numéro de département est invalide')),
  nom: Joi.string().allow('').error(new Error('Le filtre nom est invalide')),
  prenom: Joi.string()
    .allow('')
    .error(new Error('Le filtre prénom est invalide')),
  idType: Joi.string()
    .allow('')
    .error(new Error('Le filtre id type est invalide')),
  type: Joi.string().allow('').error(new Error('Le filtre type est invalide')),
});

export {
  validStatNationales,
  validStatGrandReseau,
  validStatStructure,
  validStatConseiller,
  validStatCsv,
};
