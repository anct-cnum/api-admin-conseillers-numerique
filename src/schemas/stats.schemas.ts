const Joi = require('joi');

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
    .regex(/^[0-9a-fA-F]{24}$/)
    .error(new Error("L'id du conseiller est invalide")),
  codePostal: Joi.string()
    .allow('', null)
    .error(new Error('Le filtre code postal est invalide')),
  codeCommune: Joi.string()
    .allow('', null)
    .error(new Error('Le code commune est invalide')),
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
  codePostal: Joi.string()
    .allow('', null)
    .error(new Error('Le filtre code postal est invalide')),
  codeCommune: Joi.string()
    .allow('', null)
    .error(new Error('Le filtre ville est invalide')),
});

const validStatGrandReseau = Joi.object({
  dateDebut: Joi.date()
    .required()
    .error(new Error('La date de début est invalide')),
  dateFin: Joi.date()
    .required()
    .error(new Error('La date de fin est invalide')),
  codePostal: Joi.string()
    .allow('', null)
    .error(new Error('Le filtre code postal est invalide')),
  codeCommune: Joi.string()
    .allow('', null)
    .error(new Error('Le filtre ville est invalide')),
  codeRegion: Joi.string().error(
    new Error('Le filtre code région est invalide'),
  ),
  numeroDepartement: Joi.string().error(
    new Error('Le filtre numéro de département est invalide'),
  ),
});

const validStatCsv = Joi.object({
  dateDebut: Joi.date()
    .required()
    .error(new Error('La date de début est invalide')),
  dateFin: Joi.date()
    .required()
    .error(new Error('La date de fin est invalide')),
  codePostal: Joi.string()
    .allow('', null)
    .error(new Error('Le filtre code postal est invalide')),
  ville: Joi.string().error(new Error('Le filtre ville est invalide')),
  codeCommune: Joi.string()
    .allow('', null)
    .error(new Error('Le code commune est invalide')),
  codeRegion: Joi.string().error(
    new Error('Le filtre code région est invalide'),
  ),
  numeroDepartement: Joi.string().error(
    new Error('Le filtre numéro de département est invalide'),
  ),
  nom: Joi.string().error(new Error('Le filtre nom est invalide')),
  prenom: Joi.string().error(new Error('Le filtre prénom est invalide')),
  idType: Joi.string().error(new Error('Le filtre id type est invalide')),
  type: Joi.string().error(new Error('Le filtre type est invalide')),
});

export {
  validStatNationales,
  validStatGrandReseau,
  validStatStructure,
  validStatConseiller,
  validStatCsv,
};
