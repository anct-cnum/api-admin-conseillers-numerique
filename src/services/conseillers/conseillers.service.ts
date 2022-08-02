// Initializes the `conseillers` service on path `/conseillers`
import createModel from '../../models/conseillers.model';

const { Conseillers } = require('./conseillers.class');

const hooks = require('./conseillers.hooks');

export default function (app) {
	const options = {
		Model: createModel(app),
		paginate: app.get('paginate'),
	};

	// Initialize our service with any options it requires
	app.use('/conseillers', new Conseillers(options, app));

	// Get our initialized service so that we can register hooks
	const service = app.service('conseillers');

	service.hooks(hooks);
}
