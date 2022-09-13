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

const updateEmail = Joi.string()
  .email()
  .required()
  .error(new Error("Le format de l'email est invalide"));

export { updateCandidate, updateEmail };
