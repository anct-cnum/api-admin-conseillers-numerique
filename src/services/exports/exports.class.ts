import {
  Id,
  NullableId,
  Paginated,
  Params,
  ServiceMethods,
} from '@feathersjs/feathers';
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

interface Data {}

interface ServiceOptions {}
export class Exports implements ServiceMethods<Data> {
  app: Application;
  options: ServiceOptions;

  constructor(options: ServiceOptions = {}, app: Application) {
    this.options = options;
    this.app = app;

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

  // fonctions par default créées par feathers à la génération d'un service custom (non relié à une collection) ne pas prendre en compte

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async find(params?: Params): Promise<Data[] | Paginated<Data>> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async get(id: Id, params?: Params): Promise<Data> {
    return {
      id,
      text: `A new message with ID: ${id}!`,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async create(data: Data, params?: Params): Promise<Data> {
    if (Array.isArray(data)) {
      return Promise.all(data.map((current) => this.create(current, params)));
    }

    return data;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async update(id: NullableId, data: Data, params?: Params): Promise<Data> {
    return data;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async patch(id: NullableId, data: Data, params?: Params): Promise<Data> {
    return data;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async remove(id: NullableId, data: Data, params?: Params): Promise<Data> {
    return data;
  }
}
