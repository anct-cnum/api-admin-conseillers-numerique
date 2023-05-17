const Joi = require('@hapi/joi');

const validStructures = Joi.object({
  skip: Joi.number().required().error(new Error('La pagination est invalide')),
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
  searchByNom: Joi.string().error(
    new Error('La recherche par nom est invalide'),
  ),
  departement: Joi.string().error(
    new Error('Le filtre département est invalide'),
  ),
  type: Joi.string().error(new Error('Le filtre type est invalide')),
  statut: Joi.string().error(new Error('Le filtre statut est invalide')),
  region: Joi.string().error(new Error('Le filtre région est invalide')),
  coms: Joi.string().error(new Error('Le filtre coms est invalide')),
});

const validExportStructures = Joi.object({
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
  searchByNom: Joi.string().error(
    new Error('La recherche par nom est invalide'),
  ),
  departement: Joi.string().error(
    new Error('Le filtre département est invalide'),
  ),
  type: Joi.string().error(new Error('Le filtre type est invalide')),
  statut: Joi.string().error(new Error('Le filtre statut est invalide')),
  region: Joi.string().error(new Error('Le filtre région est invalide')),
  coms: Joi.string().error(new Error('Le filtre coms est invalide')),
});

const updateEmail = Joi.string()
  .email()
  .required()
  .error(new Error("Le format de l'email est invalide"));

const updateContact = Joi.object({
  nom: Joi.string().required().error(new Error('Le nom est invalide')),
  prenom: Joi.string().required().error(new Error('Le prénom est invalide')),
  telephone: Joi.string()
    .required()
    .error(new Error('Le téléphone est invalide')),
  fonction: Joi.string()
    .required()
    .error(new Error('La fonction est invalide')),
});

export { validStructures, validExportStructures, updateEmail, updateContact };
