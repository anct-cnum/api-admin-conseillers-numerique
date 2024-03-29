const Joi = require('joi');

const validDemandesCoordinateur = Joi.object({
  page: Joi.number().required().error(new Error('La pagination est invalide')),
  statut: Joi.string().required().error(new Error('Le statut est invalide')),
  ordre: Joi.number().required().error(new Error('Le tri est invalide')),
  nomOrdre: Joi.string()
    .required()
    .error(new Error('Le nom du tri est invalide')),
  search: Joi.string().error(
    new Error('La recherche par structure est invalide'),
  ),
  departement: Joi.string().error(
    new Error('Le filtre département est invalide'),
  ),
  region: Joi.string().error(new Error('Le filtre région est invalide')),
  avisPrefet: Joi.string().error(
    new Error("Le filtre sur l'avis du préfet est invalide"),
  ),
});

const demandeCoordinateurAvisPrefet = Joi.object({
  idDemandeCoordinateur: Joi.string()
    .required()
    .error(new Error("L'id de la demande est invalide")),
  avisPrefet: Joi.string()
    .valid('favorable', 'défavorable')
    .required()
    .error(new Error('L avis est invalide')),
  commentaire: Joi.string()
    .trim()
    .min(10)
    .max(1000)
    .required()
    .error(new Error('Le commentaire est invalide')),
});

export { validDemandesCoordinateur, demandeCoordinateurAvisPrefet };
