import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import { authenticate } from '@feathersjs/express';
import { Application } from '../../declarations';
import getExportJeRecruteCsv from './controllers/getExportJeRecruteCsv';
import createAbilities from '../../middleware/createAbilities';

export default class Exports extends Service {
	constructor(options: Partial<MongooseServiceOptions>, app: Application) {
		super(options);
		app.get(
			'/exports/candidats-csv',
			authenticate('jwt'),
			createAbilities,
			getExportJeRecruteCsv(app),
		);
	}
}
