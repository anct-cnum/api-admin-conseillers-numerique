const Joi = require('@hapi/joi');

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

const validationEmail = Joi.string()
  .email()
  .required()
  .error(new Error("Le format de l'email est invalide"));

const createUserHub = Joi.object({
  email: Joi.string()
    .required()
    .email()
    .error(new Error("Le format de l'email est invalide")),
  nom: Joi.string().required().error(new Error('Le nom est invalide')),
  prenom: Joi.string().required().error(new Error('Le prénom est invalide')),
  hub: Joi.string().required().error(new Error('Le nom du hub est invalide')),
});

const createUserGrandReseau = Joi.object({
  email: Joi.string()
    .required()
    .email()
    .error(new Error("Le format de l'email est invalide")),
  nom: Joi.string().required().error(new Error('Le nom est invalide')),
  prenom: Joi.string().required().error(new Error('Le prénom est invalide')),
  reseau: Joi.string()
    .required()
    .error(new Error('Le nom du grand réseau est invalide')),
});

export {
  createUserPrefet,
  validationEmail,
  createUserHub,
  createUserGrandReseau,
};
