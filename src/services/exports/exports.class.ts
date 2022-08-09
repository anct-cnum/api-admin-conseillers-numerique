import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import { authenticate } from '@feathersjs/express';
import { Application } from '../../declarations';
import createAbilities from '../../middleware/createAbilities';
import {
	getExportCandidatsByStructureCsv,
	getExportCandidatsValideStructureCsv,
	getExportConseillersWithoutCRACsv,
	getExportJeRecruteCsv,
	getExportRupturesCsv,
	getExportStructuresCsv,
	getExportEmbauchesCsv,
} from './controllers';

export default class Exports extends Service {
	constructor(options: Partial<MongooseServiceOptions>, app: Application) {
		super(options);
		app.post(
			'/exports/candidats-csv',
			authenticate('jwt'),
			createAbilities,
			getExportJeRecruteCsv(app),
		);
		app.post(
			'/exports/candidatsValidesStructure-csv',
			authenticate('jwt'),
			createAbilities,
			getExportCandidatsValideStructureCsv(app),
		);
		app.post(
			'/exports/embauches-csv',
			authenticate('jwt'),
			createAbilities,
			getExportEmbauchesCsv(app),
		);
		app.post(
			'/exports/candidatsByStructure-csv',
			authenticate('jwt'),
			createAbilities,
			getExportCandidatsByStructureCsv(app),
		);
		app.post(
			'/exports/cnfs-without-cra-csv',
			authenticate('jwt'),
			createAbilities,
			getExportConseillersWithoutCRACsv(app),
		);
		app.post(
			'/exports/structures-csv',
			authenticate('jwt'),
			createAbilities,
			getExportStructuresCsv(app),
		);
		app.post(
			'/exports/ruptures-csv',
			authenticate('jwt'),
			createAbilities,
			getExportRupturesCsv(app),
		);
	}
}
