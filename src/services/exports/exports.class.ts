import {
  Id,
  NullableId,
  Paginated,
  Params,
  ServiceMethods,
} from '@feathersjs/feathers';
import authenticate from '../../middleware/authenticate';
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
  getExportStatistiquesCsv,
  getExportTerritoiresCsv,
  getExportListeStructuresCsv,
} from './controllers';
import getExportConseillersCsv from './controllers/getExportConseillersCsv';

interface Data {}

interface ServiceOptions {}
// eslint-disable-next-line import/prefer-default-export
export class Exports implements ServiceMethods<Data> {
  app: Application;

  options: ServiceOptions;

  // eslint-disable-next-line @typescript-eslint/default-param-last
  constructor(options: ServiceOptions = {}, app: Application) {
    this.options = options;
    this.app = app;

    app.get(
      '/exports/candidats-csv',
      authenticate(app),
      createAbilities,
      getExportJeRecruteCsv(app),
    );
    app.get(
      '/exports/candidatsValidesStructure-csv',
      authenticate(app),
      createAbilities,
      getExportCandidatsValideStructureCsv(app),
    );
    app.get(
      '/exports/embauches-csv',
      authenticate(app),
      createAbilities,
      getExportEmbauchesCsv(app),
    );
    app.get(
      '/exports/candidatsByStructure-csv',
      authenticate(app),
      createAbilities,
      getExportCandidatsByStructureCsv(app),
    );
    app.get(
      '/exports/cnfs-without-cra-csv',
      authenticate(app),
      createAbilities,
      getExportConseillersWithoutCRACsv(app),
    );
    app.get(
      '/exports/structures-csv',
      authenticate(app),
      createAbilities,
      getExportStructuresCsv(app),
    );
    app.get(
      '/exports/ruptures-csv',
      authenticate(app),
      createAbilities,
      getExportRupturesCsv(app),
    );
    app.get(
      '/exports/cnfs-hub-csv',
      authenticate(app),
      createAbilities,
      getExportConseillersHubCsv(app),
    );
    app.get(
      '/exports/statistiques-csv',
      authenticate(app),
      createAbilities,
      getExportStatistiquesCsv(app),
    );
    app.get(
      '/exports/territoires-csv',
      authenticate(app),
      createAbilities,
      getExportTerritoiresCsv(app),
    );
    app.get(
      '/exports/conseillers-csv',
      authenticate(app),
      createAbilities,
      getExportConseillersCsv(app),
    );
    app.get(
      '/exports/liste-structures-csv',
      authenticate(app),
      createAbilities,
      getExportListeStructuresCsv(app),
    );
  }

  // fonctions par default créées par feathers à la génération d'un service custom (non relié à une collection) ne pas prendre en compte

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  async find(_params?: Params): Promise<Data[] | Paginated<Data>> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  async get(id: Id, _params?: Params): Promise<Data> {
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  async update(_id: NullableId, data: Data, _params?: Params): Promise<Data> {
    return data;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  async patch(_id: NullableId, data: Data, _params?: Params): Promise<Data> {
    return data;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  async remove(_id: NullableId, data: Data): Promise<Data> {
    return data;
  }
}
