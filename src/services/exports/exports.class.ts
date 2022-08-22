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
  getExportConseillersHubCsv,
} from './controllers';

export default class Exports extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    app.get(
      '/exports/candidats-csv',
      authenticate('jwt'),
      createAbilities,
      getExportJeRecruteCsv(app),
    );
    app.get(
      '/exports/candidatsValidesStructure-csv',
      authenticate('jwt'),
      createAbilities,
      getExportCandidatsValideStructureCsv(app),
    );
    app.get(
      '/exports/embauches-csv',
      authenticate('jwt'),
      createAbilities,
      getExportEmbauchesCsv(app),
    );
    app.get(
      '/exports/candidatsByStructure-csv',
      authenticate('jwt'),
      createAbilities,
      getExportCandidatsByStructureCsv(app),
    );
    app.get(
      '/exports/cnfs-without-cra-csv',
      authenticate('jwt'),
      createAbilities,
      getExportConseillersWithoutCRACsv(app),
    );
    app.get(
      '/exports/structures-csv',
      authenticate('jwt'),
      createAbilities,
      getExportStructuresCsv(app),
    );
    app.get(
      '/exports/ruptures-csv',
      authenticate('jwt'),
      createAbilities,
      getExportRupturesCsv(app),
    );
    app.get(
      '/exports/cnfs-hub-csv',
      authenticate('jwt'),
      createAbilities,
      getExportConseillersHubCsv(app),
    );
  }
}
