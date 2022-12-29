const Joi = require('@hapi/joi');

const validConseillers = Joi.object({
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
  searchByConseiller: Joi.string().error(
    new Error('La recherche par conseiller est invalide'),
  ),
  searchByStructure: Joi.string().error(
    new Error('La recherche par structure est invalide'),
  ),
  coordinateur: Joi.string().error(
    new Error('Le filtre coordinateur est invalide'),
  ),
  rupture: Joi.string().error(new Error('Le filtre rupture est invalide')),
  region: Joi.string().error(new Error('Le filtre region est invalide')),
  piecesManquantes: Joi.string().error(
    new Error('Le filtre pièces manquantes est invalide'),
  ),
});

const validExportConseillers = Joi.object({
  dateDebut: Joi.date()
    .required()
    .error(new Error('La date de début est invalide')),
  dateFin: Joi.date()
    .required()
    .error(new Error('La date de fin est invalide')),
  ordre: Joi.number().required().error(new Error('Sort est invalide')),
  nomOrdre: Joi.string()
    .required()
    .error(new Error('Nom du sort est invalide')),
  searchByConseiller: Joi.string().error(
    new Error('La recherche par conseiller est invalide'),
  ),
  searchByStructure: Joi.string().error(
    new Error('La recherche par structure est invalide'),
  ),
  coordinateur: Joi.string().error(
    new Error('Le filtre coordinateur est invalide'),
  ),
  rupture: Joi.string().error(new Error('Le filtre rupture est invalide')),
  region: Joi.string().error(new Error('Le filtre region est invalide')),
  piecesManquantes: Joi.string().error(
    new Error('Le filtre pièces manquantes est invalide'),
  ),
});

const validCandidats = Joi.object({
  skip: Joi.number().required().error(new Error('La pagination est invalide')),
  searchByNomCandidat: Joi.string().error(
    new Error('La recherche par nom est invalide'),
  ),
  departement: Joi.string().error(
    new Error('Le filtre département est invalide'),
  ),
  region: Joi.string().error(new Error('Le filtre région est invalide')),
  coms: Joi.string().error(new Error('Le filtre coms est invalide')),
});

export { validConseillers, validExportConseillers, validCandidats };
