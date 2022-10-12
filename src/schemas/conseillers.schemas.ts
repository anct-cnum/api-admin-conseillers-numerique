const Joi = require('@hapi/joi');

const validConseillers = Joi.object({
  skip: Joi.number().required().error(new Error('Skip est invalide')),
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
    new Error('Le search by conseiller est invalide'),
  ),
  searchByStructure: Joi.string().error(
    new Error('Le search by structure est invalide'),
  ),
  coordinateur: Joi.string().error(
    new Error('Le filtre coordinateur est invalide'),
  ),
  rupture: Joi.string().error(new Error('Le filtre rupture est invalide')),
  region: Joi.string().error(new Error('Le filtre region est invalide')),
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
  search: Joi.string().error(new Error('Le search est invalide')),
  isCoordinateur: Joi.string().error(
    new Error('Le filtre coordinateur est invalide'),
  ),
  isRupture: Joi.string().error(new Error('Le filtre rupture est invalide')),
  region: Joi.string().error(new Error('Le filtre region est invalide')),
});

export { validConseillers, validExportConseillers };
