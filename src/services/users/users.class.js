const { Service } = require('feathers-mongoose');
const { getAccessibleData } = require('./controllers/users/getAccessibleData');
const {
	getAccessibleDataAggregate,
} = require('./controllers/users/getAccessibleDataAggregate');
const {
	updateAccessibleData,
} = require('./controllers/users/updateAccessibleData');

exports.Users = class Users extends Service {
	constructor(options, app) {
		super(options, app);
		this.app = app;

		app.get('/custom-route-get', getAccessibleData(app));
		app.get('/custom-route-get-aggregate', getAccessibleDataAggregate(app));
		app.patch('/custom-route-update/:id', updateAccessibleData(app));
	}
};
