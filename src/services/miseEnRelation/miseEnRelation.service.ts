// Initializes the `users` service on path `/users`
import { ServiceAddons } from '@feathersjs/feathers';
import { Application } from '../../declarations';
import MiseEnRelation from './miseEnRelation.class';
import createModel from '../../models/miseEnRelation.model';

// Add this service to the service type index
declare module '../../declarations' {
	interface ServiceTypes {
		miseEnRelation: MiseEnRelation & ServiceAddons<any>;
	}
}

export default function (app: Application): void {
	const options = {
		Model: createModel(app),
		paginate: app.get('paginate'),
	};

	// Initialize our service with any options it requires
	app.use('miseEnRelation', new MiseEnRelation(options));
}
