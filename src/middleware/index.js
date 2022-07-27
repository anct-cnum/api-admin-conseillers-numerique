const { authenticate } = require('@feathersjs/express');
const createAbilities = require('../helpers/accessControl/ability');
// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
	app.use(authenticate('jwt'));
	app.use(createAbilities);
};
