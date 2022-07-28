const { Service } = require('feathers-mongoose');
const { authenticate } = require('@feathersjs/express');
const { getAccessibleData } = require('./controllers/users/getAccessibleData');
const {
	getAccessibleDataAggregate,
} = require('./controllers/users/getAccessibleDataAggregate');
const {
	updateAccessibleData,
} = require('./controllers/users/updateAccessibleData');
const createAbilities = require('../../helpers/accessControl/ability');

exports.Users = class Users extends Service {
	constructor(options, app) {
		super(options, app);
		this.app = app;
		app.get(
			'/custom-route-get',
			authenticate('jwt'),
			createAbilities,
			getAccessibleData(app),
		);
		app.get(
			'/custom-route-get-aggregate',
			authenticate('jwt'),
			createAbilities,
			getAccessibleDataAggregate(app),
		);
		app.patch(
			'/custom-route-update/:id',
			authenticate('jwt'),
			createAbilities,
			updateAccessibleData(app),
		);
	}
};
