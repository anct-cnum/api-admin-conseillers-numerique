import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import { authenticate } from '@feathersjs/express';
import { Application } from '../../declarations';
import createAbilities from '../../middleware/createAbilities';
import {
	getExportCandidatsCsv,
	getExportCandidatsValideStructure,
	getExportCandidatsByStructure,
	getExportConseillersWithoutCRA,
} from './controllers';
import getExportStructure from './controllers/getExportStructuresCsv';
import getExportRupture from './controllers/getExportRupturesCsv';

export default class Exports extends Service {
	constructor(options: Partial<MongooseServiceOptions>, app: Application) {
		super(options);
		app.post(
			'/exports/candidat-csv',
			authenticate('jwt'),
			createAbilities,
			getExportCandidatsCsv(app),
		);
		app.post(
			'/exports/candidatsValidesStructure-csv',
			authenticate('jwt'),
			createAbilities,
			getExportCandidatsValideStructure(app),
		);
		app.post(
			'/exports/embauches-csv',
			authenticate('jwt'),
			createAbilities,
			getExportCandidatsValideStructure(app),
		);
		app.post(
			'/exports/candidatsByStructure-csv',
			authenticate('jwt'),
			createAbilities,
			getExportCandidatsByStructure(app),
		);
		app.post(
			'/exports/cnfs-without-cra-csv',
			authenticate('jwt'),
			createAbilities,
			getExportConseillersWithoutCRA(app),
		);
		app.post(
			'/exports/structures-csv',
			authenticate('jwt'),
			createAbilities,
			getExportStructure(app),
		);
		app.post(
			'/exports/ruptures-csv',
			authenticate('jwt'),
			createAbilities,
			getExportRupture(app),
		);
	}
}
