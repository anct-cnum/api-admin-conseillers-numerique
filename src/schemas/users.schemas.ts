const Joi = require('@hapi/joi');

const updateCandidate = Joi.object({
  prenom: Joi.string().required().messages({
    'string.empty': 'champ "prénom" requis',
  }),
  nom: Joi.string().required().messages({
    'string.empty': 'champ "nom" requis',
  }),
  telephone: Joi.number().max(10).required().messages({
    'any.required': 'champ "société" requis',
  }),
  dateDisponibilite: Joi.date().required().messages({
    'any.required': 'champ "civilité" requis',
  }),
  email: Joi.string().email().required().messages({
    'any.required': 'champ "fonction" requis',
  }),
});

const createUserPrefet = Joi.object({
  email: Joi.string()
    .required()
    .email()
    .error(new Error("Le format de l'email est invalide")),
  departement: Joi.string()
    .max(3)
    .error(new Error('Le code département est invalide')),
  region: Joi.string().max(3).error(new Error('Le code région est invalide')),
}).min(2);

const createUserAdminAndStructure = Joi.object({
  email: Joi.string()
    .required()
    .email()
    .error(new Error("Le format de l'email est invalide")),
});

const updateEmail = Joi.string()
  .email()
  .required()
  .error(new Error("Le format de l'email est invalide"));

export {
  updateCandidate,
  createUserPrefet,
  createUserAdminAndStructure,
  updateEmail,
};
