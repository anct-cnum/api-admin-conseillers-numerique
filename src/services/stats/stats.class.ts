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
import { getStatsNationales } from './controllers';

interface Data {}

interface ServiceOptions {}
export class Stats implements ServiceMethods<Data> {
  app: Application;
  options: ServiceOptions;

  constructor(options: ServiceOptions = {}, app: Application) {
    this.options = options;
    this.app = app;

    app.get(
      '/stats/nationales/cras',
      authenticate('jwt'),
      createAbilities,
      getStatsNationales(app),
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
