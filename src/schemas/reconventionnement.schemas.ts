const Joi = require('@hapi/joi');

const validReconventionnement = Joi.number()
  .required()
  .error(new Error('La pagination est invalide'));

export default validReconventionnement;
