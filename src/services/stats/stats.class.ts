import {
  Id,
  NullableId,
  Paginated,
  Params,
  ServiceMethods,
} from '@feathersjs/feathers';
import authenticateMode from '../../middleware/authenticateMode';
import { Application } from '../../declarations';
import createAbilities from '../../middleware/createAbilities';
import {
  getStatsNationalesGrandReseau,
  getStatsNationalesNouvelleCoop,
  getConseillersNouvelleCoop,
} from './controllers';

interface Data {}

interface ServiceOptions {}
// eslint-disable-next-line import/prefer-default-export
export class Stats implements ServiceMethods<Data> {
  app: Application;

  options: ServiceOptions;

  constructor(app: Application, options: ServiceOptions = {}) {
    this.options = options;
    this.app = app;
    this.options = options;

    app.get(
      '/stats/nationales/cras/nouvelle-coop',
      authenticateMode(app),
      createAbilities(app),
      getStatsNationalesNouvelleCoop(app),
    );
    app.get(
      '/admin/conseillers/nouvelle-coop',
      authenticateMode(app),
      createAbilities(app),
      getConseillersNouvelleCoop(app),
    );
    app.get(
      '/stats/nationales/cras/grand-reseau',
      authenticateMode(app),
      createAbilities(app),
      getStatsNationalesGrandReseau(app),
    );
  }

  // fonctions par default créées par feathers à la génération d'un service custom (non relié à une collection) ne pas prendre en compte
  // eslint-disable-next-line class-methods-use-this
  async find(): Promise<Data[] | Paginated<Data>> {
    return [];
  }

  // eslint-disable-next-line class-methods-use-this
  async get(id: Id): Promise<Data> {
    return {
      id,
      text: `A new message with ID: ${id}!`,
    };
  }

  async create(data: Data, params?: Params): Promise<Data> {
    if (Array.isArray(data)) {
      return Promise.all(data.map((current) => this.create(current, params)));
    }

    return data;
  }

  // eslint-disable-next-line class-methods-use-this
  async update(_id: NullableId, data: Data): Promise<Data> {
    return data;
  }

  // eslint-disable-next-line class-methods-use-this
  async patch(_id: NullableId, data: Data): Promise<Data> {
    return data;
  }

  // eslint-disable-next-line class-methods-use-this
  async remove(_id: NullableId, data: Data): Promise<Data> {
    return data;
  }
}
