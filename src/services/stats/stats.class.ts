/* eslint-disable class-methods-use-this */
/* eslint-disable import/prefer-default-export */
/* eslint-disable @typescript-eslint/no-unused-vars */
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
  getStatsNationales,
  getDatasStructures,
  getStatsStructure,
  getStatsTerritoires,
  getStatsTerritoire,
  getStatsTerritoireCra,
} from './controllers';

interface Data {}

interface ServiceOptions {}
// eslint-disable-next-line import/prefer-default-export
export class Stats implements ServiceMethods<Data> {
  app: Application;

  options: ServiceOptions;

  // eslint-disable-next-line @typescript-eslint/default-param-last
  constructor(options: ServiceOptions = {}, app: Application) {
    this.options = options;
    this.app = app;
    this.options = options;

    app.get(
      '/stats/nationales/cras',
      authenticate('jwt'),
      createAbilities,
      getStatsNationales(app),
    );
    app.get(
      '/stats/structure/cras',
      authenticate('jwt'),
      createAbilities,
      getStatsStructure(app),
    );
    app.get(
      '/stats/datas/structures',
      authenticate('jwt'),
      createAbilities,
      getDatasStructures(app),
    );
    app.get(
      '/stats/territoires',
      authenticate('jwt'),
      createAbilities,
      getStatsTerritoires(app, options),
    );
    app.get(
      '/stats/territoire',
      authenticate('jwt'),
      createAbilities,
      getStatsTerritoire(app),
    );
    app.get(
      '/stats/territoire/cra',
      authenticate('jwt'),
      createAbilities,
      getStatsTerritoireCra(app),
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
  async remove(_id: NullableId, data: Data, _params?: Params): Promise<Data> {
    return data;
  }
}
