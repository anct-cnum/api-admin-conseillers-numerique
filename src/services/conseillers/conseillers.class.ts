import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import { authenticate } from '@feathersjs/express';
import { Application } from '../../declarations';
import getConseillers from './controllers/getConseillers';
import createAbilities from '../../middleware/createAbilities';

export default class Conseillers extends Service {
	constructor(options: Partial<MongooseServiceOptions>, app: Application) {
		super(options);
		app.get(
			'/conseillers',
			authenticate('jwt'),
			createAbilities,
			getConseillers(app),
		);
	}
}
