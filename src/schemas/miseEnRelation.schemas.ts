const Joi = require('@hapi/joi');

const validMiseEnRelation = Joi.object({
  skip: Joi.number().required().error(new Error('La pagination est invalide')),
  ordre: Joi.number().required().error(new Error('Le tri est invalide')),
  nomOrdre: Joi.string()
    .required()
    .error(new Error('Le nom du tri est invalide')),
  search: Joi.string().error(
    new Error('La recherche par nom du candidat est invalide'),
  ),
  filter: Joi.string()
    .valid(
      'nouvelle',
      'interessee',
      'nonInteressee',
      'recrutee',
      'finalisee',
      'nouvelle_rupture',
      'finalisee_rupture',
      'toutes',
    )
    .error(new Error('Le filtre statut est invalide')),
  pix: Joi.string().error(new Error('Le filtre pix est invalide')),
  cv: Joi.string().error(new Error('Le filtre cv est invalide')),
  ccp1: Joi.string().error(new Error('Le filtre CCP1 est invalide')),
  diplome: Joi.string().error(new Error('Le filtre diplôme est invalide')),
});

export default validMiseEnRelation;
